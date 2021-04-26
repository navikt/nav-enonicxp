const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    cron: require('/lib/cron'),
    node: require('/lib/xp/node'),
    repo: require('/lib/xp/repo'),
    event: require('/lib/xp/event'),
    cluster: require('/lib/xp/cluster'),
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

const CRON_CONFIG = {
    name: TASK_DESCRIPTION,
    fixedDelay: TIME_BETWEEN_CHECKS,
};
exports.cronConfig = CRON_CONFIG;

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
exports.getInvalidatorState = getState;

function setIsRunning(isRunning, clearLock = false) {
    const now = new Date().toISOString();
    navRepo.modify({
        key: '/unpublish',
        editor: (el) => {
            const data = { ...el.data };
            if (isRunning === false && !clearLock) {
                data.lastRun = now;
            }
            data.isRunning = isRunning;
            return { ...el, data };
        },
    });
    return isRunning ? null : now;
}

function releaseInvalidatorLock() {
    // releasing the lock and setting clearLock to true, to prevent overwriting of the lastRun date
    setIsRunning(false, true);
}
exports.releaseInvalidatorLock = releaseInvalidatorLock;

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
                .map((el) => libs.content.get({ key: el.id }))
                .filter((s) => !!s);
            if (content.length > 0) {
                libs.event.send({
                    type: 'prepublish',
                    distributed: true,
                    data: {
                        prepublished: content,
                    },
                });
                content.forEach((item) => {
                    log.info(`PREPUBLISHED: ${item._path}`);
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

function theJob() {
    let state = null;
    try {
        // There is two conditions which must be upheld for the cache invalidator to run
        // --
        // 1. The node has to be master
        // 2. No other task is currently doing the invalidation
        // --
        // if not the task must sleep for TIME_BETWEEN_CHECKS

        if (!libs.cluster.isMaster()) {
            return;
        }

        state = getState();
        if (state.isRunning) {
            return;
        }
    } catch (e) {
        log.error(
            `Could not start the invalidator, trying again in ${TIME_BETWEEN_CHECKS / 1000} seconds`
        );
        log.error(e);
        return;
    }

    let sleepFor = TIME_BETWEEN_CHECKS;
    try {
        // set flag to prevent others from invalidating the cache simultaneously
        setIsRunning(true);

        const now = Date.now();
        const testDate = new Date();
        if (state) {
            // use last run from the lock if exists
            prevTestDate = new Date(state.lastRun) || prevTestDate;
        }

        // remove cache for prepublished content
        const prepublishedContent = getPrepublishedContent(prevTestDate, testDate);
        removeCacheOnPrepublishedContent(prepublishedContent);

        // unpublish expired content
        const expiredContent = getExpiredContent(testDate);
        removeExpiredContentFromMaster(expiredContent);

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

    let successfulRelease = false;
    const numberOfTimesToTry = 5;
    const retryDelay = 5000;
    let numberOfRetries = 0;

    libs.cron.schedule({
        name: 'retryLockRelease',
        fixedDelay: retryDelay,
        times: numberOfTimesToTry,
        callback: function () {
            numberOfRetries += 1;
            try {
                const updatedLastRun = setIsRunning(false);
                prevTestDate = updatedLastRun ? new Date(updatedLastRun) : prevTestDate;
                successfulRelease = true;
            } catch (e) {
                if (numberOfRetries === numberOfTimesToTry) {
                    log.error(
                        `failed to release the lock after ${numberOfTimesToTry}, the invalidator is deadlocked`
                    );
                } else {
                    log.info(
                        `could not release the lock, attempt: ${numberOfRetries} next in ${
                            retryDelay / 1000
                        }s`
                    );
                }
            }

            if (successfulRelease) {
                if (numberOfRetries > 1) {
                    log.info('released the lock');
                }
                libs.cron.unschedule({
                    name: 'retryLockRelease',
                });
            }
        },
    });

    // reschedule to for TIME_BETWEEN_CHECKS or less if publishing
    // events are scheduled before that time
    if (sleepFor !== TIME_BETWEEN_CHECKS) {
        libs.cron.reschedule({ ...CRON_CONFIG, delay: sleepFor, callback: theJob });
    }
}

exports.start = (appIsRunning) => {
    log.info(`Starting: ${TASK_DESCRIPTION}`);
    if (!taskHasStarted && appIsRunning) {
        taskHasStarted = true;
        return libs.cron.schedule({ ...CRON_CONFIG, callback: theJob });
    }

    log.info(`Task ${TASK_DESCRIPTION} already running or app has shut down`);
    return false;
};
