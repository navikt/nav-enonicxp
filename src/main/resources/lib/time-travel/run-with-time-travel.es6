/*
 * NOTE:
 *
 * This functionality alters content retrieval functions in order to get content from a certain
 * timestamp, with all references also correctly resolved to this timestamp. This is a very scary hack
 * which can result in outdated content being served if proper cleanup is not done after every
 * requesting thread. Make sure you understand what you're doing if you make any changes. :D
 *
 * */

const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');
const { getNodeKey } = require('/lib/time-travel/version-utils');
const { getVersionFromTime } = require('/lib/time-travel/version-utils');
const { getNodeVersions } = require('/lib/time-travel/version-utils');
const { generateUUID } = require('/lib/headless/uuid');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');

const Thread = Java.type('java.lang.Thread');

let timeTravelHooksEnabled = false;

const contentLibGetStandard = contentLib.get;
const nodeLibConnectStandard = nodeLib.connect;

const getCurrentThreadId = () => Number(Thread.currentThread().getId());

// If the requested time is older than the oldest version of the content,
// return the timestamp of the oldest version instead
const getTargetUnixTime = ({ nodeKey, requestedUnixTime, repo, branch }) => {
    if (!nodeKey) {
        return requestedUnixTime;
    }

    const nodeVersions = getNodeVersions({
        nodeKey,
        repo,
        branch,
    });
    const length = nodeVersions?.length;
    if (!length) {
        return requestedUnixTime;
    }

    const oldestVersion = nodeVersions[length - 1];
    const oldestUnixTime = getUnixTimeFromDateTimeString(oldestVersion.timestamp);

    return Math.max(oldestUnixTime, requestedUnixTime);
};

const timeTravelConfig = {
    configs: {},
    add: function ({ threadId, requestedDateTime, branch = 'master', baseContentKey }) {
        const context = contextLib.get();
        const repo = nodeLibConnectStandard({
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

        log.info(`Adding time travel config for thread ${threadId}}`);

        this.configs[threadId] = {
            repo,
            branch,
            baseNodeKey,
            baseContentKey,
            targetUnixTime,
        };
    },
    get: function (threadId) {
        const config = this.configs[threadId];

        // Check for 'undefined' to account for a rare/strange nashorn behaviour where a deleted object
        // entry sometimes returns an object of the Undefined Java class, which evalutes to true
        if (config?.toString() === 'undefined') {
            log.error(`Time travel config returned an unexpected object for thread ${threadId}`);
            return undefined;
        }

        return this.configs[threadId];
    },
    remove: function (threadId) {
        delete this.configs[threadId];
    },
    clear: function () {
        this.configs = {};
    },
};

// This function will hook database retrieval functions to retrieve data from
// the version at the requested timestamp. Only calls from threads currently
// registered with a time travel config will be affected.
const hookLibsWithTimeTravel = () => {
    timeTravelHooksEnabled = true;

    contentLib.get = function (args) {
        const threadId = getCurrentThreadId();
        const configForThread = timeTravelConfig.get(threadId);

        // If the function is called while hooked, only threads with time travel parameters set
        // should get non-standard functionality
        if (!configForThread) {
            return contentLibGetStandard(args);
        }

        const key = args?.key;

        // If the key is not defined, use standard functionality for error handling
        if (!key) {
            return contentLibGetStandard(args);
        }

        const { repo, branch, baseContentKey, targetUnixTime } = configForThread;

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

        // If a content node version from the requested time was found, retrieve this
        // content with standard functionality
        return runInBranchContext(
            () =>
                contentLibGetStandard({
                    key: requestedVersion.nodeId,
                    versionId: requestedVersion.versionId,
                }),
            branch
        );
    };

    nodeLib.connect = function (connectArgs) {
        const threadId = getCurrentThreadId();
        const configForThread = timeTravelConfig.get(threadId);

        // If the function is called while hooked, only threads with time travel parameters set
        // should get non-standard functionality
        if (!configForThread) {
            return nodeLibConnectStandard(connectArgs);
        }

        const { branch, targetUnixTime, baseNodeKey } = configForThread;

        const repoConnection = nodeLibConnectStandard(connectArgs);
        const repoGet = repoConnection.get.bind(repoConnection);

        // repo.get args can be a single key, or an array of keys, or an object
        // (or array of objects) with the shape { key: <id or path> }
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

// Restore standard functionality (disables time travel)
const unhookTimeTravel = () => {
    timeTravelHooksEnabled = false;
    timeTravelConfig.clear();
    contentLib.get = contentLibGetStandard;
    nodeLib.connect = nodeLibConnectStandard;
};

const runWithTimeTravel = (requestedDateTime, branch, baseContentKey, callback) => {
    if (!timeTravelHooksEnabled) {
        log.error(
            `Time travel: got request for ${baseContentKey} but time travel is disabled on this node`
        );
        return callback();
    }

    const threadId = getCurrentThreadId();
    const sessionId = generateUUID();

    try {
        log.info(
            `Time travel: Starting session ${sessionId} - base content: ${baseContentKey} / time: ${requestedDateTime} / branch: ${branch} / thread: ${threadId}`
        );
        timeTravelConfig.add({
            threadId,
            requestedDateTime,
            branch,
            baseContentKey,
        });
        return callback();
    } catch (e) {
        log.info(`Time travel: Error occured during session ${sessionId} - ${e}`);
        throw e;
    } finally {
        timeTravelConfig.remove(threadId);
        log.info(`Time travel: Ending session ${sessionId} for thread ${threadId}`);
    }
};

module.exports = {
    hookLibsWithTimeTravel,
    unhookTimeTravel,
    runWithTimeTravel,
    contentLibGetStandard,
    nodeLibConnectStandard,
    timeTravelHooksEnabled,
};
