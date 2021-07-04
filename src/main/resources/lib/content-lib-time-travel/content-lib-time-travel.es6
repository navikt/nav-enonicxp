const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');

const contentLibGetOriginal = contentLib.get;

const getVersionFromTime = (contentVersions, time) => {
    const length = contentVersions.length;
    if (!length) {
        return null;
    }

    for (let i = 0; i < length; i++) {
        const version = contentVersions[i];
        const versionTime = getUnixTimeFromDateTimeString(version.timestamp);
        if (time >= versionTime) {
            return version;
        }
    }

    log.info(`Version not found for requested time, returning oldest version`);
    return contentVersions[length - 1];
};

const unhookContentLibTimeTravel = () => {
    contentLib.get = contentLibGetOriginal;
};

const getNodeVersions = (contentRef, repo, branch) => {
    const nodeKey = contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');
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
// after yourself after retrieving the data you want. Do this by running the
// 'unhookContentLibTimeMachine' function at the end of every possible logic branch
// (remember to catch errors!)
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
        `Travelling back in time to ${requestedTime} on branch ${branch} for base content ${baseContentRef}`
    );

    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch,
    });

    const requestedUnixTime = getUnixTimeFromDateTimeString(requestedTime);

    // If a base contentRef is provided, ensure versions retrieved are not older than
    // what would be available for the first version of this content.
    const validUnixTime = baseContentRef
        ? getValidUnixTimeFromContent(requestedUnixTime, baseContentRef, repo)
        : requestedUnixTime;

    const nodeVersionsBase = getNodeVersions(baseContentRef, repo, branch);
    log.info(`Base content versions: ${JSON.stringify(nodeVersionsBase)}`);

    // TODO: legg til flere funksjoner - getChildren, getAttachments
    contentLib.get = (args) => {
        const key = args?.key;
        if (!key) {
            return contentLibGetOriginal();
        }

        const nodeVersions = getNodeVersions(key, repo, branch);

        const requestedVersion = getVersionFromTime(nodeVersions, validUnixTime);
        if (!requestedVersion) {
            log.info(`No versions found for ${key}, returning current live version`);
            return contentLibGetOriginal(args);
        }

        return runInBranchContext(
            () =>
                contentLibGetOriginal({
                    key: requestedVersion.nodeId,
                    versionId: requestedVersion.versionId,
                }),
            branch
        );
    };
};

const contentLibTimeTravel = (requestedTime, branch, baseContentRef, callback) => {
    dangerouslyHookContentLibWithTimeTravel(requestedTime, branch, baseContentRef);

    try {
        return callback();
    } catch (e) {
        log.info(`Error occured while time-travelling - ${e}`);
        throw e;
    } finally {
        unhookContentLibTimeTravel();
        log.info('Returning to the present');
    }
};

module.exports = {
    contentLibTimeTravel,
};
