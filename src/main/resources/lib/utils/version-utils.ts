import * as contextLib from '/lib/xp/context';
import { getRepoConnection } from './repo-connection';
import { RepoConnection, NodeVersionMetadata } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { contentLibGetStandard } from '../time-travel/standard-functions';
import { logger } from './logging';
import { getUnixTimeFromDateTimeString } from './datetime-utils';

const MAX_VERSIONS_COUNT_TO_RETRIEVE = 1000;

export const getNodeKey = (contentRef: string) =>
    contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');

export const getNodeVersions = ({
    nodeKey,
    repo,
    branch,
    modifiedOnly = false,
}: {
    nodeKey: string;
    repo: RepoConnection;
    branch: RepoBranch;
    modifiedOnly?: boolean;
}) => {
    const result = repo.findVersions({
        key: nodeKey,
        start: 0,
        count: MAX_VERSIONS_COUNT_TO_RETRIEVE,
    });

    if (result.total > MAX_VERSIONS_COUNT_TO_RETRIEVE) {
        logger.warning(
            `Content node ${nodeKey} has more than the maximum allowed versions count ${MAX_VERSIONS_COUNT_TO_RETRIEVE}`
        );
    }

    const versions = result.hits;

    if (branch !== 'master') {
        return versions;
    }

    // Get only versions that have been committed to master
    const commitedVersions = versions.filter((version) => !!version.commitId);

    if (!modifiedOnly) {
        return commitedVersions;
    }

    // Filter out versions with no changes, ie commits as a result of moving or
    // unpublishing/republishing without modifications
    // Reverse the versions array to process oldest versions first
    // This ensures the initial committed version is kept, and subsequent (unmodified)
    // commits are discarded
    const modifiedVersions = commitedVersions.reverse().reduce((acc, version) => {
        const content = contentLibGetStandard({
            key: version.nodeId,
            versionId: version.versionId,
        });

        if (!content || content.modifiedTime === acc[0]?.modifiedTime) {
            return acc;
        }

        return [{ ...version, modifiedTime: content.modifiedTime }, ...acc];
    }, [] as (NodeVersionMetadata & { modifiedTime?: string })[]);

    return modifiedVersions;
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

// Used by the version history selector in the frontend
export const getPublishedVersionTimestamps = (contentRef: string) => {
    const context = contextLib.get();
    const repo = getRepoConnection({
        repoId: context.repository,
        branch: 'master',
    });

    const versions = getNodeVersions({
        nodeKey: getNodeKey(contentRef),
        branch: 'master',
        repo,
        modifiedOnly: true,
    });

    return versions.map((version) => version.timestamp);
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
