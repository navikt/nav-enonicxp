import contextLib from '/lib/xp/context';
import nodeLib, { RepoConnection } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { getUnixTimeFromDateTimeString, removeDuplicates } from './nav-utils';
import { contentLibGetStandard } from '../time-travel/standard-functions';

export const getNodeKey = (contentRef: string) =>
    contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');

export const getNodeVersions = ({
    nodeKey,
    repo,
    branch,
    modifiedOnly = true,
}: {
    nodeKey: string;
    repo: RepoConnection;
    branch: RepoBranch;
    modifiedOnly?: boolean;
}) => {
    const versions = repo.findVersions({
        key: nodeKey,
        start: 0,
        count: 1000,
    }).hits;

    if (branch === 'master') {
        // Get only versions that have been committed to master
        const commitedVersions = versions.filter((version) => !!version.commitId);

        if (!modifiedOnly) {
            return commitedVersions;
        }

        // Filter out versions with no changes, ie commits as a result of moving or
        // unpublishing/republishing without modifications
        // Reverse and unreverse to ensure the initial version is the one kept
        // if multiple versions have the same modified time
        const modifiedVersions = removeDuplicates(
            commitedVersions.reverse(),
            (versionA, versionB) => {
                const contentA = contentLibGetStandard({
                    key: versionA.nodeId,
                    versionId: versionA.versionId,
                });
                const contentB = contentLibGetStandard({
                    key: versionB.nodeId,
                    versionId: versionB.versionId,
                });

                return contentA?.modifiedTime === contentB?.modifiedTime;
            }
        ).reverse();

        return modifiedVersions;
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
    branch: RepoBranch;
    getOldestIfNotFound: boolean;
}) => {
    const contentVersions = getNodeVersions({ nodeKey, repo, branch });
    const length = contentVersions?.length;
    if (!length) {
        return null;
    }

    // Return the newest version which is equal to or older than the requested time
    const foundVersion = contentVersions.find((version) => {
        const versionUnixTime = getUnixTimeFromDateTimeString(version.timestamp);
        return unixTime >= versionUnixTime;
    });

    if (!foundVersion && getOldestIfNotFound) {
        return contentVersions[length - 1];
    }

    return foundVersion;
};

export const getVersionTimestamps = (contentRef: string, branch: RepoBranch = 'master') => {
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

// Used by the version history selector in the frontend
export const getPublishedVersionTimestamps = (contentRef: string, branch: RepoBranch) => {
    // In production, requests from master should not include version timestamps
    // This check must be removed if/when we decide to make version history public
    if (app.config.env === 'p' && branch === 'master') {
        return {};
    }

    return getVersionTimestamps(contentRef, 'master');
};

// If the requested time is older than the oldest version of the content,
// return the timestamp of the oldest version instead
export const getTargetUnixTime = ({
    nodeKey,
    requestedUnixTime,
    repo,
    branch,
}: {
    nodeKey: string;
    requestedUnixTime: number;
    repo: RepoConnection;
    branch: RepoBranch;
}) => {
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
