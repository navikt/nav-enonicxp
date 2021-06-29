const contentLib = require('/lib/xp/content');
const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');

const contentLibGet = contentLib.get;

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

const hookContentLibGetWithTimeMachine = (requestedTimestamp) => {
    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: 'master',
    });

    log.info(`Going back in time to ${requestedTimestamp}`);

    const requestedUnixTime = new Date(requestedTimestamp).getTime();

    contentLib.get = (args) => {
        if (!args?.key) {
            return contentLibGet();
        }

        const nodeKey = args.key.replace(/^\/www.nav.no/, '/content/www.nav.no');
        const nodeVersions = repo.findVersions({ key: nodeKey, start: 0, count: 1000 });

        const requestedVersion = getVersionFromRequestedTime(nodeVersions.hits, requestedUnixTime);
        if (!requestedVersion) {
            log.info(`No versions found for ${nodeKey}, returning current live version`);
            return contentLibGet(args);
        }

        return contentLibGet({
            key: requestedVersion.nodeId,
            versionId: requestedVersion.versionId,
        });
    };
};

const unhookTimeMachine = () => {
    contentLib.get = contentLibGet;
};

module.exports = { hookContentLibGetWithTimeMachine, unhookTimeMachine };
