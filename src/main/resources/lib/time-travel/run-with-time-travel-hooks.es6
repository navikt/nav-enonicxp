const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');
const { generateUUID } = require('/lib/headless/uuid');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');

const contentLibGet = contentLib.get.bind(contentLib);
const nodeLibConnect = nodeLib.connect.bind(nodeLib);

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
// Failing to do so may leave the hooked functions corrupted, and outdated data will be
// served indefinitely.
//
// Do not use asynchronously!
const dangerouslyHookLibsWithTimeTravel = (
    requestedDateTime,
    branch = 'master',
    baseContentKey
) => {
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
            log.info(
                `Time travel: No version found for ${key} at time ${targetUnixTime} on branch ${branch}`
            );
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
        const repoConnection = nodeLibConnect(connectArgs);
        const repoGet = repoConnection.get.bind(repoConnection);

        // repo.get args can be a single key, or an array of keys, or an object
        // or array of objects of the form { key: <id or path> }
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

// Execute a callback function while contentLib is hooked to retreive data from
// a specified date/time
const runWithTimeTravelHooks = (requestedDateTime, branch, baseContentKey, callback) => {
    const sessionId = generateUUID();
    log.info(
        `Time travel: Starting session ${sessionId} - base content: ${baseContentKey} / time: ${requestedDateTime} / branch: ${branch}`
    );

    dangerouslyHookLibsWithTimeTravel(requestedDateTime, branch, baseContentKey);

    try {
        return callback();
    } catch (e) {
        log.info(`Time travel: Error occured during session ${sessionId} - ${e}`);
        throw e;
    } finally {
        unhookTimeTravel();
        log.info(`Time travel: Ending session ${sessionId}`);
    }
};

module.exports = {
    runWithTimeTravelHooks,
};
