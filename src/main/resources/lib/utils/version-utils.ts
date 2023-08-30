import * as contextLib from '/lib/xp/context';
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
    const modifiedVersions = commitedVersions.reverse().reduce(
        (acc, version) => {
            const content = repoConnectionStandard.get({
                key: version.nodeId,
                versionId: version.versionId,
            });

            if (!content || content.modifiedTime === acc[0]?.modifiedTime) {
                return acc;
            }

            return [{ ...version, modifiedTime: content.modifiedTime }, ...acc];
        },
        [] as (NodeVersionMetadata & { modifiedTime?: string })[]
    );

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

const getPreMigrationVersions = ({
    nodeKey,
    repoId,
    branch,
}: {
    nodeKey: string;
    repoId: string;
    branch: RepoBranch;
}) => {
    const contentNode = getRepoConnection({ repoId, branch: 'draft' }).get(nodeKey);
    if (!contentNode) {
        logger.info(`Content not found: ${nodeKey} ${repoId}`);
        return [];
    }

    const layerMigrationData = contentNode.x?.[COMPONENT_APP_KEY]?.layerMigration as LayerMigration;
    if (!layerMigrationData) {
        logger.info(`Layer migration data not found: ${nodeKey} ${repoId}`);
        return [];
    }

    const {
        targetReferenceType,
        repoId: archiveRepoId,
        contentId: archivedContentId,
        ts: migrationTimestamp,
    } = layerMigrationData;

    if (targetReferenceType !== 'archived') {
        logger.info(`Layer migration reference is wrong type: ${nodeKey} ${repoId}`);
        return [];
    }

    const versions = getNodeVersions({
        nodeKey: archivedContentId,
        branch: branch,
        repoId: archiveRepoId,
    }).filter(
        (version) =>
            version.nodePath.startsWith('/content') && version.timestamp < migrationTimestamp
    );

    return versions;
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

    const nodeKey = getNodeKey(contentRef);

    const versions = getNodeVersions({
        nodeKey,
        branch: 'master',
        repoId: repository,
        modifiedOnly: shouldGetModifiedTimestampsOnly(contentRef, repository),
    });

    const archivedVersions = getPreMigrationVersions({
        nodeKey,
        repoId: repository,
        branch: 'master',
    });

    const liveTs = versions.map((version) => version.timestamp);

    const oldestLiveTs = liveTs.slice(-1)[0];

    const archivedTs = archivedVersions
        .map((version) => version.timestamp)
        .filter((ts) => ts < oldestLiveTs);

    logger.info(`Found live versions: ${JSON.stringify(liveTs)}`);
    logger.info(`Found archived versions: ${JSON.stringify(archivedTs)}`);

    return [...liveTs, ...archivedTs];
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
