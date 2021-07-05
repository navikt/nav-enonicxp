const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');

const contentLibGet = contentLib.get;

const getNodeKey = (contentRef) => contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');

const getVersionFromTime = (contentVersions, requestedUnixTime, alwaysGetOldest) => {
    const length = contentVersions?.length;
    if (!length) {
        return null;
    }

    // Return the newest version which is older than the requested time
    const foundVersion = contentVersions.find((version) => {
        const versionUnixTime = getUnixTimeFromDateTimeString(version.timestamp);
        return requestedUnixTime >= versionUnixTime;
    });

    if (!foundVersion && alwaysGetOldest) {
        return contentVersions[length - 1];
    }

    return foundVersion;
};

const getNodeVersions = (contentRef, repo, branch) => {
    const nodeKey = getNodeKey(contentRef);
    const versions = repo.findVersions({ key: nodeKey, start: 0, count: 10000 }).hits;
    if (branch === 'master') {
        return versions.filter((version) => !!version.commitId);
    }
    return versions;
};

// If the requested time is older than the oldest version of the content,
// return the timestamp of the oldest version instead
const getValidUnixTimeFromContent = (requestedUnixTime, contentRef, repo) => {
    const nodeVersions = getNodeVersions(contentRef, repo);
    const length = nodeVersions?.length;
    // If no versions exist, return the current time
    if (!length) {
        return new Date().getTime();
    }

    const oldestVersion = nodeVersions[length - 1];
    const oldestUnixTime = getUnixTimeFromDateTimeString(oldestVersion.timestamp);

    return Math.max(oldestUnixTime, requestedUnixTime);
};

// This function will hook database query functions to ensure data is retrieved from
// the version at the requested timestamp. It is _EXTREMELY_ important to clean up
// after retrieving the data you want. Do this by running the 'unhookContentLibTimeMachine'
// function at the end of every possible logic branch (remember to catch errors!)
//
// Failing to do so will leave the hooked functions corrupted, and outdated data will be
// served indefinitely.
//
// Do not use asynchronously!
const dangerouslyHookContentLibWithTimeTravel = (
    requestedTime,
    branch = 'master',
    baseContentKey
) => {
    log.info(
        `Time travel: Retrieving content from base content ${baseContentKey} for time ${requestedTime} on branch ${branch}`
    );

    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch,
    });

    const requestedUnixTime = getUnixTimeFromDateTimeString(requestedTime);

    // If a base content key is provided, ensure versions retrieved from referenced contents
    // are not older than what would be available for the first version of the base content
    const retrieveFromUnixTime = baseContentKey
        ? getValidUnixTimeFromContent(requestedUnixTime, baseContentKey, repo)
        : requestedUnixTime;

    contentLib.get = (args) => {
        const key = args?.key;
        if (!key) {
            return contentLibGet(args);
        }

        const nodeVersions = getNodeVersions(key, repo, branch);
        const requestedVersion = getVersionFromTime(
            nodeVersions,
            retrieveFromUnixTime,
            key === baseContentKey
        );

        if (!requestedVersion) {
            log.info(
                `Time travel: No version found for ${key} at time ${retrieveFromUnixTime} on branch ${branch}`
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
};

const unhookContentLibTimeTravel = () => {
    contentLib.get = contentLibGet;
};

// Execute a callback function while contentLib is hooked to retreive data from
// a specified date/time
const contentLibTimeTravel = (requestedDateTime, branch, baseContentKey, callback) => {
    dangerouslyHookContentLibWithTimeTravel(requestedDateTime, branch, baseContentKey);

    try {
        return callback();
    } catch (e) {
        log.info(
            `Time travel: Error occured while retrieving historical data from content ${baseContentKey} at time ${requestedDateTime} on branch ${branch} - ${e}`
        );
        throw e;
    } finally {
        unhookContentLibTimeTravel();
        log.info('Time travel: Returning to the present');
    }
};

module.exports = {
    contentLibTimeTravel,
};
