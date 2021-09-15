const contextLib = require('/lib/xp/context');
const nodeLib = require('/lib/xp/node');

const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');

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

const getVersionTimestamps = (contentRef, branch = 'master') => {
    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch,
    });

    const versions = getNodeVersions({ nodeKey: getNodeKey(contentRef), branch, repo });

    return versions.map((version) => version.timestamp);
};

module.exports = {
    getNodeKey,
    getVersionFromTime,
    getNodeVersions,
    getVersionTimestamps,
};
