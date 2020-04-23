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
const navRepo = libs.node.connect({
    repoId: 'no.nav.navno',
    branch: 'master',
    user: {
        login: 'su',
    },
    pricipals: ['role:system.admin'],
});
let prevTestDate = new Date();
let taskHasStarted = false;
const TIME_BETWEEN_CHECKS = 60000;
const TASK_DESCRIPTION = 'CacheInvalidatorForTimedPublishingEvents';
exports.taskDescription = TASK_DESCRIPTION;

function getSleepFor(prepublishOnNext, now) {
    let sleepFor = TIME_BETWEEN_CHECKS;
    prepublishOnNext.forEach(c => {
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
        editor: el => {
            const data = { ...el.data };
            if (isRunning === false) {
                data.lastRun = new Date().toISOString();
            }
            data.isRunning = isRunning;
            return { ...el, data };
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
            const content = prepublishedContent
                .map(el => libs.content.get({ key: el.id }))
                .filter(s => !!s);
            if (content.length > 0) {
                libs.event.send({
                    type: 'prepublish',
                    distributed: true,
                    data: {
                        prepublished: content,
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
            expiredContent.forEach(c => {
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

function runTask(applicationIsRunning) {
    return libs.task.submit({
        description: TASK_DESCRIPTION,
        task: () => {
            try {
                const state = getState();

                // There are two conditions which must be upheld for the cache invalidator to run
                // --
                // 1. The navno application must be running
                // 2. No other task is currently doing the invalidation
                // --
                // if not the task must sleep for TIME_BETWEEN_CHECKS

                if (!applicationIsRunning) {
                    libs.task.sleep(TIME_BETWEEN_CHECKS);
                    return;
                }
                if (state.isRunning) {
                    libs.task.sleep(TIME_BETWEEN_CHECKS);
                    return;
                }
            } catch (e) {
                log.error(
                    `Could not start the invalidator, trying again in ${TIME_BETWEEN_CHECKS /
                        1000} seconds`
                );
                log.error(e);
                libs.task.sleep(TIME_BETWEEN_CHECKS);
                return;
            }

            // set flag to prevent others from invalidating the cache simultaneously
            setIsRunning(true);

            let sleepFor = TIME_BETWEEN_CHECKS;
            try {
                const now = Date.now();
                const testDate = new Date(now);

                // remove cache for prepublished content
                const prepublishedContent = getPrepublishedContent(prevTestDate, testDate);
                removeCacheOnPrepublishedContent(prepublishedContent);

                // unpublish expired content
                const expiredContent = getExpiredContent(testDate);
                removeExpiredContentFromMaster(expiredContent);

                // update global prevTestDate with last test date for next run
                prevTestDate = testDate;

                // calculate time to sleep
                const prepublishOnNext = getPrepublishedContent(
                    testDate,
                    new Date(now + TIME_BETWEEN_CHECKS)
                );

                if (prepublishOnNext.length > 0) {
                    sleepFor = getSleepFor(prepublishOnNext, now);
                }
            } catch (e) {
                log.error(e);
            }
            // release the lock
            setIsRunning(false);

            // keep the task running (sleep) for TIME_BETWEEN_CHECKS or less if publishing
            // events are scheduled before that time
            libs.task.sleep(sleepFor);
        },
    });
}
exports.runTask = runTask;

exports.start = appIsRunning => {
    log.info(`Starting: ${TASK_DESCRIPTION}`);
    if (!taskHasStarted && appIsRunning) {
        taskHasStarted = true;
        return runTask(appIsRunning);
    }

    log.info(`Task ${TASK_DESCRIPTION} already running or app has shut down`);
    return false;
};
