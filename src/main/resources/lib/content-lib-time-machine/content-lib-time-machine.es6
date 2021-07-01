const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');
const { runInBranchContext } = require('/lib/headless/branch-context');

const contentLibGetOriginal = contentLib.get;

const getVersionFromRequestedTime = (contentVersions, requestedTime) => {
    const length = contentVersions.length;
    if (!length) {
        return null;
    }

    for (let i = 0; i < length; i++) {
        const version = contentVersions[i];
        const versionTime = new Date(version.timestamp).getTime();
        if (requestedTime > versionTime) {
            return version;
        }
    }

    log.info(`Version not found for requested time, returning oldest version`);
    return contentVersions[length - 1];
};

const unhookContentLibTimeTravel = () => {
    contentLib.get = contentLibGetOriginal;
};

// This function will hook contentLib database query functions to ensure data is
// retrieved from the version at the requested timestamp. It is _EXTREMELY_ important
// to clean up after yourself after retrieving the data you want. Do this by running the
// 'unhookContentLibTimeMachine' function at the end of every possible logic branch
// (remember to catch errors!)
//
// Failing to do so will leave the hooked functions corrupted, and outdated data will be
// served until the safety timer kicks in
//
// Do not use asynchronously!
const dangerouslyHookContentLibWithTimeTravel = (requestedTimestamp, branch) => {
    log.info(`Going back in time to ${requestedTimestamp}`);

    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch,
    });

    const requestedUnixTime = new Date(requestedTimestamp).getTime();

    contentLib.get = (args) => {
        if (!args?.key) {
            return contentLibGetOriginal();
        }

        const nodeKey = args.key.replace(/^\/www.nav.no/, '/content/www.nav.no');
        const nodeVersions = repo.findVersions({ key: nodeKey, start: 0, count: 1000 });

        const requestedVersion = getVersionFromRequestedTime(nodeVersions.hits, requestedUnixTime);
        if (!requestedVersion) {
            log.info(`No versions found for ${nodeKey}, returning current live version`);
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

const contentLibTimeTravel = (requestedTimestamp, branch, callback) => {
    dangerouslyHookContentLibWithTimeTravel(requestedTimestamp, branch);

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
