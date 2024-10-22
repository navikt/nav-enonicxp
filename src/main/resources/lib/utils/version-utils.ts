import { NodeVersion } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { nodeLibConnectStandard } from '../time-travel/standard-functions';
import { logger } from './logging';
import { getUnixTimeFromDateTimeString } from './datetime-utils';
import { contentTypesWithCustomEditor } from '../contenttype-lists';
import { getLayersData } from '../localization/layers-data';
import { getLayersMigrationArchivedContentRef } from '../time-travel/layers-migration-refs';
import { Content } from '/lib/xp/content';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { isContentLocalized } from '../localization/locale-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';

const MAX_VERSIONS_COUNT_TO_RETRIEVE = 2000;

export const getNodeKey = (contentRef: string) =>
    contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');

export type VersionHistoryReference = NodeVersion & { locale: string };

type GetNodeVersionsParams = {
    nodeKey: string;
    repoId: string;
    branch: RepoBranch;
    modifiedOnly?: boolean;
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
    modifiedOnly = false,
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

    if (branch !== 'master') {
        return result.hits;
    }

    // Get only versions that have been committed to master
    const commitedVersions = result.hits.filter((version) => !!version.commitId);

    if (!modifiedOnly) {
        return commitedVersions;
    }

    const repoConnectionStandard = nodeLibConnectStandard({ repoId, branch });

    // Filter out versions with no changes, ie commits as a result of moving or
    // unpublishing/republishing without modifications
    // Reverse the versions array to process oldest versions first
    // This ensures the initial committed version is kept, and subsequent (unmodified)
    // commits are discarded
    const modifiedVersions = commitedVersions
        .reverse()
        .reduce<Array<NodeVersion & { modifiedTime?: string }>>((acc, version) => {
            const content = repoConnectionStandard.get<Content>({
                key: version.nodeId,
                versionId: version.versionId,
            });

            if (!content || content.modifiedTime === acc[0]?.modifiedTime) {
                return acc;
            }

            return [{ ...version, modifiedTime: content.modifiedTime }, ...acc];
        }, []);

    return modifiedVersions;
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

const getLayerMigrationVersionRefs = ({
    nodeKey,
    repoId,
    branch,
}: {
    nodeKey: string;
    repoId: string;
    branch: RepoBranch;
}): VersionHistoryReference[] => {
    const contentNode = nodeLibConnectStandard({ repoId, branch: 'draft' }).get(nodeKey);
    if (!contentNode) {
        return [];
    }

    const archivedContentRef = getLayersMigrationArchivedContentRef({ contentId: nodeKey, repoId });
    if (!archivedContentRef) {
        return [];
    }

    const { archivedRepoId, archivedContentId, migrationTs } = archivedContentRef;

    const preMigrationVersions = getNodeVersions({
        nodeKey: archivedContentId,
        branch: branch,
        repoId: archivedRepoId,
    }).filter(
        (version) => version.nodePath.startsWith('/content') && version.timestamp < migrationTs
    );

    return preMigrationVersions.map((version) => ({
        ...version,
        locale: getLayersData().repoIdToLocaleMap[archivedRepoId],
    }));
};

// Workaround for content types with a custom editor, which does not update the modifiedTime field
// in the same way as the Content Studio editor. We always need to include all timestamps for these
// types.
const shouldGetModifiedTimestampsOnly = (contentRef: string, repoId: string) => {
    const content = nodeLibConnectStandard({
        repoId,
        branch: 'master',
    }).get<Content>(contentRef);

    return content
        ? !(contentTypesWithCustomEditor as ContentDescriptor[]).includes(content.type)
        : true;
};

// Used by the version history selector in the frontend
export const getPublishedVersionRefs = (
    contentRef: string,
    locale: string
): VersionHistoryReference[] => {
    const repoId = getLayersData().localeToRepoIdMap[locale];

    const nodeKey = getNodeKey(contentRef);

    const versions = getNodeVersions({
        nodeKey,
        branch: 'master',
        repoId,
        modifiedOnly: shouldGetModifiedTimestampsOnly(contentRef, repoId),
    });

    const baseRefs = versions.map((version) => ({
        ...version,
        locale,
    }));

    const migrationRefs = getLayerMigrationVersionRefs({
        nodeKey,
        repoId,
        branch: 'master',
    });

    if (migrationRefs.length === 0) {
        return baseRefs;
    }

    return [...baseRefs, ...migrationRefs].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
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
