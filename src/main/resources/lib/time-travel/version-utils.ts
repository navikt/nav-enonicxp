import { getUnixTimeFromDateTimeString } from '../nav-utils';
import contextLib from '/lib/xp/context';
import nodeLib from '/lib/xp/node';
import { RepoConnection } from '/lib/xp/node';
import { Branch } from '../../types/branch';

export const getNodeKey = (contentRef: string) =>
    contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');

export const getNodeVersions = ({
    nodeKey,
    repo,
    branch,
}: {
    nodeKey: string;
    repo: RepoConnection;
    branch: Branch;
}) => {
    const versions = repo.findVersions({
        key: nodeKey,
        start: 0,
        count: 10000,
    }).hits;
    if (branch === 'master') {
        return versions.filter((version) => !!version.commitId);
    }
    return versions;
};

export const getVersionFromTime = ({
    nodeKey,
    unixTime,
    repo,
    branch,
    getOldestIfNotFound,
}: {
    nodeKey: string;
    unixTime: number;
    repo: RepoConnection;
    branch: Branch;
    getOldestIfNotFound: boolean;
}) => {
    const contentVersions = getNodeVersions({ nodeKey, repo, branch });
    const length = contentVersions?.length;
    if (!length) {
        return null;
    }

    // Return the newest version which is equal to or older than the requested time
    const foundVersion = contentVersions.find((version) => {
        const versionUnixTime = getUnixTimeFromDateTimeString(
            version.timestamp
        );
        return unixTime >= versionUnixTime;
    });

    if (!foundVersion && getOldestIfNotFound) {
        return contentVersions[length - 1];
    }

    return foundVersion;
};

export const getVersionTimestamps = (
    contentRef: string,
    branch: Branch = 'master'
) => {
    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch,
    });

    const versions = getNodeVersions({
        nodeKey: getNodeKey(contentRef),
        branch,
        repo,
    });

    return versions.map((version) => version.timestamp);
};
