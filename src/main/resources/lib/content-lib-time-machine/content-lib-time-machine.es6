const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');
const cronLib = require('/lib/cron');
const { runInBranchContext } = require('/lib/headless/branch-context');

const taskName = 'timemachine-safety-valve';
const safetyTimerMs = 15000;

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

const unhookContentLibTimeMachine = () => {
    contentLib.get = contentLibGetOriginal;
    cronLib.unschedule({ name: taskName });
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
const dangerouslyHookContentLibWithTimeMachine = (requestedTimestamp, branch) => {
    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch,
    });

    log.info(`Going back in time to ${requestedTimestamp}`);

    const requestedUnixTime = new Date(requestedTimestamp).getTime();

    // Unhook the functions after a certain period of time
    cronLib.schedule({
        name: taskName,
        delay: safetyTimerMs,
        fixedDelay: safetyTimerMs,
        times: 1,
        callback: () => {
            unhookContentLibTimeMachine();
            log.error(`Stopped time machine due to timeout after ${safetyTimerMs}ms`);
        },
        context: {
            repository: 'com.enonic.cms.default',
            branch: 'master',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
    });

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

module.exports = {
    dangerouslyHookContentLibWithTimeMachine,
    unhookContentLibTimeMachine,
};
