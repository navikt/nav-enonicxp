import * as contextLib from '/lib/xp/context';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from './repo-utils';
import { NodeVersionMetadata } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { nodeLibConnectStandard } from '../time-travel/standard-functions';
import { logger } from './logging';
import { getUnixTimeFromDateTimeString } from './datetime-utils';
import { contentTypesWithCustomEditor } from '../contenttype-lists';
import { COMPONENT_APP_KEY } from '../constants';
import { LayerMigration } from '../../site/x-data/layerMigration/layerMigration';

const MAX_VERSIONS_COUNT_TO_RETRIEVE = 1000;

export const getNodeKey = (contentRef: string) =>
    contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');

type GetNodeVersionsParams = {
    nodeKey: string;
    repoId: string;
    branch: RepoBranch;
    modifiedOnly?: boolean;
};

const getMigratedNodeVersions = (params: GetNodeVersionsParams) => {
    const { nodeKey, repoId, branch, modifiedOnly = false } = params;

    const repo = getRepoConnection({ repoId, branch });

    const contentNode = repo.get<Content>(nodeKey);
    if (!contentNode) {
        logger.info(`Content not found: ${nodeKey}`);
        return [];
    }

    const currentVersions = getNodeVersions(params);

    const layerMigration = contentNode.x?.[COMPONENT_APP_KEY]?.layerMigration as LayerMigration;

    if (!layerMigration || layerMigration.targetReferenceType === 'archived') {
        return currentVersions;
    }

    const {
        contentId: archivedContentId,
        repoId: archivedLayerId,
        ts: migrationTs,
    } = layerMigration;

    const archivedVersions = getNodeVersions({
        nodeKey: archivedContentId,
        repoId: archivedLayerId,
        branch: 'master',
        modifiedOnly,
    });

    logger.info(
        `Live versions of ${contentNode._path} (${nodeKey}): ${JSON.stringify(currentVersions)}`
    );
    logger.info(
        `Archived versions of ${contentNode._path} (${archivedContentId}): ${JSON.stringify(
            archivedVersions
        )}`
    );

    return [
        ...currentVersions.filter((version) => version.timestamp > migrationTs),
        ...archivedVersions.filter((version) => version.timestamp <= migrationTs),
    ];
};

export const getNodeVersions = ({
    nodeKey,
    repoId,
    branch,
    modifiedOnly = false,
}: GetNodeVersionsParams) => {
    const repo = getRepoConnection({ repoId, branch });

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

    const repoConnectionStandard = nodeLibConnectStandard({ repoId, branch });

    // Filter out versions with no changes, ie commits as a result of moving or
    // unpublishing/republishing without modifications
    // Reverse the versions array to process oldest versions first
    // This ensures the initial committed version is kept, and subsequent (unmodified)
    // commits are discarded
    const modifiedVersions = commitedVersions.reverse().reduce((acc, version) => {
        const content = repoConnectionStandard.get({
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
    repoId,
    branch,
    getOldestIfNotFound,
}: {
    nodeKey: string;
    unixTime: number;
    repoId: string;
    branch: RepoBranch;
    getOldestIfNotFound: boolean;
}) => {
    const contentVersions = getNodeVersions({ nodeKey, repoId, branch });
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

// Workaround for content types with a custom editor, which does not update the modifiedTime field
// in the same way as the Content Studio editor. We always need to include all timestamps for these
// types.
const shouldGetModifiedTimestampsOnly = (contentRef: string, repoId: string) => {
    const content = getRepoConnection({
        repoId,
        branch: 'master',
    }).get(contentRef);

    return content ? !contentTypesWithCustomEditor.includes(content.type) : true;
};

// Used by the version history selector in the frontend
export const getPublishedVersionTimestamps = (contentRef: string) => {
    const { repository } = contextLib.get();

    const versions = getMigratedNodeVersions({
        nodeKey: getNodeKey(contentRef),
        branch: 'master',
        repoId: repository,
        modifiedOnly: shouldGetModifiedTimestampsOnly(contentRef, repository),
    });

    return versions.map((version) => version.timestamp);
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
