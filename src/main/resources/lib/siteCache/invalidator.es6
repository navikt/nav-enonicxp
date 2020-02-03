const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    task: require('/lib/xp/task'),
    node: require('/lib/xp/node'),
    repo: require('/lib/xp/repo'),
    event: require('/lib/xp/event'),
};
const masterRepo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'master',
    principals: ['role:system.admin'],
});
const draftRepo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});
const navRepo = libs.node.connect({
    repoId: 'no.nav.navno',
    branch: 'master',
    user: {
        login: 'su',
    },
    pricipals: ['role:system.admin'],
});

let prevTestDate = new Date();

const TIME_BETWEEN_CHECKS = 60000;
const PADDING = 10000;
const TASK_DESCRIPTION = 'ClearScheduledPublished';
exports.taskDescription = TASK_DESCRIPTION;

let taskHasStarted = false;
exports.start = function (appIsRunning) {
    if (!taskHasStarted && appIsRunning) {
        taskHasStarted = true;
        const currentTaskId = setupTask(appIsRunning);
        return currentTaskId;
    } else {
        log.info('unpublish task already running or app has shut down');
    }
};

exports.setupTask = setupTask;
function setupTask (applicationIsRunning) {
    return libs.task.submit({
        description: TASK_DESCRIPTION,
        task: () => {
            // stop if another node is running this task
            let state = getState();
            if (!applicationIsRunning || (state.isRunning && (state.lastRun && Date.parse(state.lastRun) + TIME_BETWEEN_CHECKS + PADDING > Date.now()))) {
                libs.task.sleep(TIME_BETWEEN_CHECKS);
                return;
            }
            setIsRunning(true);

            let sleepFor = TIME_BETWEEN_CHECKS;

            // add a try/catch in case something goes boom
            try {
                const now = Date.now();
                const testDate = new Date(now);

                // remove cache for prepublished content
                const prepublishedContent = getPrepublishedContent(prevTestDate, testDate);
                removeCacheOnPrepublishedContent(prepublishedContent);

                // unpublish expired content
                const expiredContent = getExpiredContent(testDate);
                removeExpiredContentFromMaster(expiredContent);
                // save last test date for next run
                prevTestDate = testDate;

                // 1 minute between each check or for next prepublished
                const prepublishOnNext = getPrepublishedContent(testDate, new Date(now + (TIME_BETWEEN_CHECKS)));
                if (prepublishOnNext.length > 0) {
                    sleepFor = getSleepFor(prepublishOnNext, now);
                }
            } catch (e) {
                log.error(e);
            }

            setIsRunning(false);
            libs.task.sleep(sleepFor);
        },
    });
}

function getPrepublishedContent(fromDate, toDate) {
    let prepublishedContent = [];
    let start = 0;
    let count = 1000;
    while (count === 1000) {
        const hits = masterRepo.query({
            start,
            count,
            query: `publish.from < instant("${toDate.toISOString()}") AND publish.from > instant("${fromDate.toISOString()}")`,
        }).hits;
        count = hits.length;
        start += count;
        prepublishedContent = prepublishedContent.concat(hits);
    }
    return prepublishedContent;
}

function removeCacheOnPrepublishedContent(prepublishedContent) {
    libs.context.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'master',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        () => {
            prepublishedContent = prepublishedContent.map(el => libs.content.get({
                key: el.id,
            })).filter(s => !!s);
            if (prepublishedContent.length > 0) {
                libs.event.send({
                    type: 'prepublish',
                    distributed: true,
                    data: {
                        prepublished: prepublishedContent,
                    },
                });
            }
        }
    );
    if (prepublishedContent.length > 0) {
        log.info(`PREPUBLISHED (${prepublishedContent.length}) CACHE CLEARED`);
    }
}

function getExpiredContent(testDate) {
    let expiredContent = [];
    let start = 0;
    let count = 1000;
    while (count === 1000) {
        const hits = masterRepo.query({
            start,
            count,
            query: `publish.to < instant("${testDate.toISOString()}")`,
        }).hits;
        count = hits.length;
        start += count;
        expiredContent = expiredContent.concat(hits);
    }
    return expiredContent;
}

function removeExpiredContentFromMaster(expiredContent) {
    libs.context.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        () => {
            expiredContent.forEach((c) => {
                try {
                    const content = masterRepo.get(c.id);
                    if (content) {
                        libs.content.unpublish({
                            keys: [c.id],
                        });
                        log.info(`UNPUBLISHED :: ${content._path}`);
                    }
                } catch (e) {
                    log.error(e);
                }
            });
        }
    );
    if (expiredContent.length > 0) {
        log.info(`UNPUBLISHED (${expiredContent.length}) EXPIRED CONTENT`);
    }
}

function getSleepFor(prepublishOnNext, now) {
    let sleepFor = TIME_BETWEEN_CHECKS;
    prepublishOnNext.forEach((c) => {
        const content = masterRepo.get(c.id);
        const publishOn = new Date(content.publish.from);
        if (publishOn - now < sleepFor) {
            sleepFor = publishOn - now;
        }
    });
    sleepFor += 10;
    log.info(`WILL PUBLISH ON NEXT (${sleepFor}MS)`);
    return sleepFor;
}

function getState() {
    let unpublishContent = navRepo.get('/unpublish');
    if (!unpublishContent) {
        unpublishContent = navRepo.create({
            _name: 'unpublish',
            parentPath: '/',
            refresh: true,
            data: {
                isRunning: false,
                lastRun: null,
            },
        });
    }
    return unpublishContent.data;
}

function setIsRunning(isRunning) {
    navRepo.modify({
        key: '/unpublish',
        editor: (el) => {
            if (isRunning === false) {
                el.data.lastRun = new Date().toISOString();
            }
            el.data.isRunning = isRunning;
            return el;
        },
    });
}
