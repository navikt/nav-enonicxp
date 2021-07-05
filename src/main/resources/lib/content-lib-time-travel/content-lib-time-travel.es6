const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');

const contentLibGet = contentLib.get;

const getNodeKey = (contentRef) => contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');

const getVersionFromTime = (contentVersions, time) => {
    const length = contentVersions?.length;
    if (!length) {
        return null;
    }

    // Return the newest version which is older than the requested time,
    // or the oldest version if the above does not exist
    return contentVersions.find((version, index) => {
        const versionTime = getUnixTimeFromDateTimeString(version.timestamp);
        return time >= versionTime || index === length - 1;
    });
};

const getNodeVersions = (contentRef, repo, branch) => {
    const nodeKey = getNodeKey(contentRef);
    const versions = repo.findVersions({ key: nodeKey, start: 0, count: 1000 }).hits;
    if (branch === 'master') {
        return versions.filter((version) => !!version.commitId);
    }
    return versions;
};

// If the requested time is older than the oldest version of the content,
// return the timestamp of the oldest version instead
const getValidUnixTimeFromContent = (requestedUnixTime, contentRef, repo) => {
    const nodeVersions = getNodeVersions(contentRef, repo);
    // If no versions exist, return the current time
    if (nodeVersions.length === 0) {
        return new Date().getTime();
    }

    const oldestVersion = nodeVersions.slice(-1)[0];
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
    baseContentRef
) => {
    log.info(
        `Time travel: Retrieving content from ${requestedTime} on branch ${branch} for base content ${baseContentRef}`
    );

    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch,
    });

    const requestedUnixTime = getUnixTimeFromDateTimeString(requestedTime);

    // If a base contentRef is provided, ensure versions retrieved are not older than
    // what would be available for the first version of this content.
    const retrieveFromUnixTime = baseContentRef
        ? getValidUnixTimeFromContent(requestedUnixTime, baseContentRef, repo)
        : requestedUnixTime;

    contentLib.get = (args) => {
        const key = args?.key;
        if (!key) {
            return contentLibGet(args);
        }

        const nodeVersions = getNodeVersions(key, repo, branch);
        const requestedVersion = getVersionFromTime(nodeVersions, retrieveFromUnixTime);

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
const contentLibTimeTravel = (requestedDateTime, branch, baseContentRef, callback) => {
    dangerouslyHookContentLibWithTimeTravel(requestedDateTime, branch, baseContentRef);

    try {
        return callback();
    } catch (e) {
        log.info(
            `Time travel: Error occured while retrieving historical data from content ${baseContentRef} at time ${requestedDateTime} on branch ${branch} - ${e}`
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
