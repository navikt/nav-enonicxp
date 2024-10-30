import { NodeVersion } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { nodeLibConnectStandard } from '../time-travel/standard-functions';
import { logger } from './logging';
import { getUnixTimeFromDateTimeString } from './datetime-utils';
import { Content } from '/lib/xp/content';
import { isContentLocalized } from '../localization/locale-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';

const MAX_VERSIONS_COUNT_TO_RETRIEVE = 2000;

export type GetNodeVersionsParams = {
    nodeKey: string;
    repoId: string;
    branch: RepoBranch;
};

// For non-localized content, we need to retrieve content from the default repo
// as the locale layer content will not have a complete version history
const getRepoIdForLocalizedContent = ({
    nodeKey,
    repoId,
    branch,
}: GetNodeVersionsParams): string => {
    const selectedRepo = nodeLibConnectStandard({ repoId, branch });
    const selectedContent = selectedRepo.get<Content>(nodeKey);

    return !selectedContent ||
        selectedContent._nodeType !== 'content' ||
        isContentLocalized(selectedContent)
        ? repoId
        : CONTENT_ROOT_REPO_ID;
};

export const getNodeVersions = ({
    nodeKey,
    repoId,
    branch,
}: GetNodeVersionsParams): NodeVersion[] => {
    const repo = nodeLibConnectStandard({ repoId, branch });

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

    if (branch === 'master') {
        return result.hits.filter((version) => !!version.commitId);
    }

    return result.hits;
};

export const getContentVersionFromTime = ({
    nodeKey,
    unixTime,
    repoId,
    branch,
    getOldestIfNotFound,
    localizedOnly,
}: {
    nodeKey: string;
    unixTime: number;
    repoId: string;
    branch: RepoBranch;
    getOldestIfNotFound: boolean;
    localizedOnly?: boolean;
}) => {
    const repoIdActual = localizedOnly
        ? getRepoIdForLocalizedContent({ nodeKey, repoId, branch })
        : repoId;

    const contentVersions = getNodeVersions({ nodeKey, repoId: repoIdActual, branch });
    const length = contentVersions?.length;
    if (!length) {
        return null;
    }

    // Return the newest version which is equal to or older than the requested time
    const foundVersion = contentVersions.find((version) => {
        const versionUnixTime = getUnixTimeFromDateTimeString(version.timestamp);
        return unixTime >= versionUnixTime;
    });

    const foundVersionFinal =
        !foundVersion && getOldestIfNotFound ? contentVersions[length - 1] : foundVersion;

    return foundVersionFinal ? { ...foundVersionFinal, repoId: repoIdActual } : foundVersionFinal;
};

// If the requested time is older than the oldest version of the content,
// return the timestamp of the oldest version instead
export const getTargetUnixTime = ({
    nodeKey,
    requestedUnixTime,
    repoId,
    branch,
}: {
    nodeKey: string;
    requestedUnixTime: number;
    repoId: string;
    branch: RepoBranch;
}) => {
    if (!nodeKey) {
        return requestedUnixTime;
    }

    const nodeVersions = getNodeVersions({
        nodeKey,
        repoId,
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
