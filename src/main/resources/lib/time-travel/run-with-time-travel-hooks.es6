const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');
const taskLib = require('/lib/xp/task');
const { generateUUID } = require('/lib/headless/uuid');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');

const Thread = Java.type('java.lang.Thread');

const contentLibGet = contentLib.get;
const nodeLibConnect = nodeLib.connect;

const getCurrentThreadId = () => Number(Thread.currentThread().getId());
const getCurrentThreadName = () => Thread.currentThread().getName().toString();

const getNodeKey = (contentRef) => contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');

const getNodeVersions = ({ nodeKey, repo, branch }) => {
    const versions = repo.findVersions({ key: nodeKey, start: 0, count: 10000 }).hits;
    if (branch === 'master') {
        return versions.filter((version) => !!version.commitId);
    }
    return versions;
};

const getVersionFromTime = ({ nodeKey, unixTime, repo, branch, getOldestIfNotFound }) => {
    const contentVersions = getNodeVersions({ nodeKey, repo, branch });
    const length = contentVersions?.length;
    if (!length) {
        return null;
    }

    // Return the newest version which is older than the requested time
    const foundVersion = contentVersions.find((version) => {
        const versionUnixTime = getUnixTimeFromDateTimeString(version.timestamp);
        return unixTime >= versionUnixTime;
    });

    if (!foundVersion && getOldestIfNotFound) {
        return contentVersions[length - 1];
    }

    return foundVersion;
};

// If the requested time is older than the oldest version of the content,
// return the timestamp of the oldest version instead
const getTargetUnixTime = ({ nodeKey, requestedUnixTime, repo, branch }) => {
    if (!nodeKey) {
        return requestedUnixTime;
    }

    const nodeVersions = getNodeVersions({ nodeKey, repo, branch });
    const length = nodeVersions?.length;
    if (!length) {
        return requestedUnixTime;
    }

    const oldestVersion = nodeVersions[length - 1];
    const oldestUnixTime = getUnixTimeFromDateTimeString(oldestVersion.timestamp);

    return Math.max(oldestUnixTime, requestedUnixTime);
};

// This function will hook database retrieval functions to retrieve data from
// the version at the requested timestamp. It is _EXTREMELY_ important to clean up
// after retrieving the data you want. Do this by running the 'unhookTimeTravel'
// function at the end of every possible logic branch (remember to catch errors!)
//
// Failing to do so will leave the hooked functions corrupted, and outdated data may be
// served indefinitely.
//
// Do not use asynchronously - do not use concurrently. This is not thread-safe!
const dangerouslyHookLibsWithTimeTravel = (
    requestedDateTime,
    branch = 'master',
    baseContentKey,
    timeTravelThreadId
) => {
    log.info(
        `Time travel: initiated by thread id: ${timeTravelThreadId} - name: ${getCurrentThreadName()}`
    );

    const context = contextLib.get();
    const repo = nodeLibConnect({
        repoId: context.repository,
        branch: branch,
    });

    const baseNodeKey = getNodeKey(baseContentKey);
    const requestedUnixTime = getUnixTimeFromDateTimeString(requestedDateTime);

    const targetUnixTime = getTargetUnixTime({
        nodeKey: baseNodeKey,
        requestedUnixTime,
        repo,
        branch,
    });

    contentLib.get = function (args) {
        // If the function is called while hooked, only the thread which initiated the hook
        // should get non-standard functionality
        if (getCurrentThreadId() !== timeTravelThreadId) {
            return contentLibGet(args);
        }

        const key = args?.key;
        if (!key) {
            return contentLibGet(args);
        }

        const requestedVersion = getVersionFromTime({
            nodeKey: getNodeKey(key),
            repo,
            branch,
            unixTime: targetUnixTime,
            getOldestIfNotFound: key === baseContentKey,
        });

        if (!requestedVersion) {
            return null;
        }

        return runInBranchContext(
            () =>
                contentLibGet({
                    key: requestedVersion.nodeId,
                    versionId: requestedVersion.versionId,
                }),
            branch
        );
    };

    nodeLib.connect = function (connectArgs) {
        // If the function is called while hooked, only the thread which initiated the hook
        // should get non-standard functionality
        if (getCurrentThreadId() !== timeTravelThreadId) {
            return nodeLibConnect(connectArgs);
        }

        const repoConnection = nodeLibConnect(connectArgs);
        const repoGet = repoConnection.get.bind(repoConnection);

        // repo.get args can be a single key, or an array of keys, or an object
        // or array of objects of the shape { key: <id or path> }
        const getNodeKeysFromArgs = (args) => {
            if (typeof args === 'string') {
                return args;
            }

            if (Array.isArray(args)) {
                return args.map(getNodeKeysFromArgs);
            }

            if (args && typeof args === 'object') {
                return getNodeKeysFromArgs(args.key);
            }

            return null;
        };

        const getNode = (nodeKey) => {
            const requestedVersion = getVersionFromTime({
                nodeKey,
                repo: repoConnection,
                branch,
                unixTime: targetUnixTime,
                getOldestIfNotFound: nodeKey === baseNodeKey,
            });

            if (!requestedVersion) {
                return null;
            }

            // Templates should always resolve to the active version, to avoid inconsistent
            // component structures
            if (requestedVersion.nodePath.startsWith('/content/www.nav.no/_templates')) {
                return repoGet(nodeKey);
            }

            return repoGet({
                key: requestedVersion.nodeId,
                versionId: requestedVersion.versionId,
            });
        };

        repoConnection.get = function (getArgs) {
            const nodeKeys = getNodeKeysFromArgs(getArgs);
            if (!nodeKeys) {
                return null;
            }

            if (Array.isArray(nodeKeys)) {
                return nodeKeys.map(getNode);
            }

            return getNode(nodeKeys);
        };

        return repoConnection;
    };
};

const unhookTimeTravel = () => {
    contentLib.get = contentLibGet;
    nodeLib.connect = nodeLibConnect;
};

const timeoutMs = 15000;
const retryPeriodMs = 500;
const queueMaxLength = 10;
const timeTravelQueue = [];

// Execute a callback function while libs are hooked to retreive data from a
// specified date/time. This implements a thread-based queueing mechanism, as it
// does not currently support concurrent usage.
const runWithTimeTravelHooks = (requestedDateTime, branch, baseContentKey, callback) => {
    const threadId = getCurrentThreadId();
    const threadName = getCurrentThreadName();

    if (timeTravelQueue.length > queueMaxLength) {
        log.warning(`Time travel: queue is at max length, denying request on thread ${threadId}`);
        throw new Error('Queue is full');
    }

    timeTravelQueue.push(threadId);

    if (timeTravelQueue.length > 1) {
        const startTime = new Date().getTime();
        log.info(
            `Time travel: Thread ${threadId} joined the queue - queue length is now ${
                timeTravelQueue.length
            } - queue: ${JSON.stringify(timeTravelQueue)}`
        );

        while (timeTravelQueue[0] !== threadId) {
            const currentTime = new Date().getTime();
            if (currentTime - startTime > timeoutMs) {
                const queueIndex = timeTravelQueue.indexOf(threadId);
                if (queueIndex !== -1) {
                    timeTravelQueue.splice(queueIndex, 1);
                } else {
                    log.error(
                        `Time travel: queue integrity lost! Thread ${threadId}/${threadName} should be in queue but was not found`
                    );
                }

                log.info(
                    `Time travel: Thread ${threadId} dropped from queue - queue length is now ${timeTravelQueue.length}`
                );
                throw new Error('Timed out while queued');
            }
            taskLib.sleep(retryPeriodMs);
        }
    }

    const sessionId = generateUUID();

    try {
        log.info(
            `Time travel: Starting session ${sessionId} - base content: ${baseContentKey} / time: ${requestedDateTime} / branch: ${branch} / thread: ${threadId} ${threadName} / queue length: ${timeTravelQueue.length}`
        );
        dangerouslyHookLibsWithTimeTravel(requestedDateTime, branch, baseContentKey, threadId);
        return callback();
    } catch (e) {
        log.info(`Time travel: Error occured during session ${sessionId} - ${e}`);
        throw e;
    } finally {
        unhookTimeTravel();
        const threadLeaving = timeTravelQueue.shift();
        if (threadLeaving !== threadId) {
            log.error(
                `Time travel: queue integrity lost! Shift result: ${threadLeaving} - expected: ${threadId}`
            );
        }
        log.info(`Time travel: Ending session ${sessionId} for thread ${threadId} ${threadName}`);
    }
};

module.exports = {
    runWithTimeTravelHooks,
    unhookTimeTravel,
};
