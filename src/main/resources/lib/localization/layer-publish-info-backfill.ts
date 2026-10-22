import { Content } from '/lib/xp/content';
import { RepoConnection, RepoNode } from '/lib/xp/node';
import { getRepoConnection } from '../repos/repo-utils';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { batchedNodeQuery } from '../utils/batched-query';
import { toggleCacheInvalidationOnNodeEvents } from '../cache/invalidate-event-defer';
import { getLayersData } from './layers-data';
import { isContentLocalized } from './locale-utils';
import { NON_LOCALIZED_QUERY_FILTER } from './layers-repo-utils/localization-state-filters';
import {
    buildPublishedLayerPublishInfo,
    isEqualPublishInfo,
    patchPublishInfo,
} from './layer-publish-info';

const BATCH_SIZE = 100;
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

type BackfillResult = {
    updated: number;
    unchanged: number;
    missingRootPublishInfo: number;
    failed: number;
};

const getNodesById = (connection: RepoConnection, ids: string[]) =>
    forceArray(connection.get<Content>(ids)).reduce<Record<string, RepoNode<Content>>>(
        (nodesById, node) => {
            nodesById[node._id] = node;
            return nodesById;
        },
        {}
    );

const backfillLayerRepo = (repoId: string): BackfillResult => {
    const layerDraft = getRepoConnection({ repoId, branch: 'draft', asAdmin: true });
    const layerMaster = getRepoConnection({ repoId, branch: 'master', asAdmin: true });
    const rootMaster = getRepoConnection({
        repoId: CONTENT_ROOT_REPO_ID,
        branch: 'master',
        asAdmin: true,
    });

    const contentIds = batchedNodeQuery({
        repo: layerMaster,
        queryParams: {
            query: '_path LIKE "/content/*"',
            filters: { boolean: { must: NON_LOCALIZED_QUERY_FILTER } },
        },
    }).hits.map((hit) => hit.id);

    logger.info(`Backfilling publish info for ${contentIds.length} nodes in ${repoId}`);

    const result: BackfillResult = {
        updated: 0,
        unchanged: 0,
        missingRootPublishInfo: 0,
        failed: 0,
    };

    for (let start = 0; start < contentIds.length; start += BATCH_SIZE) {
        const ids = contentIds.slice(start, start + BATCH_SIZE);
        const layerDraftNodes = getNodesById(layerDraft, ids);
        const layerMasterNodes = getNodesById(layerMaster, ids);
        const rootMasterNodes = getNodesById(rootMaster, ids);

        ids.forEach((id) => {
            const layerDraftNode = layerDraftNodes[id];
            const layerMasterNode = layerMasterNodes[id];
            const rootPublish = rootMasterNodes[id]?.publish;

            if (!layerDraftNode || !layerMasterNode || isContentLocalized(layerDraftNode)) {
                result.unchanged++;
                return;
            }

            if (!rootPublish?.from) {
                result.missingRootPublishInfo++;
                return;
            }

            const isInSync = layerDraftNode._versionKey === layerMasterNode._versionKey;

            const publishInfo = buildPublishedLayerPublishInfo(layerDraftNode.publish, rootPublish);

            // Draft has changes which are not on master, so it should not be marked as in sync
            if (!isInSync) {
                delete publishInfo.time;
            }

            if (isEqualPublishInfo(layerDraftNode.publish, publishInfo)) {
                result.unchanged++;
                return;
            }

            try {
                // Patching both branches when they are in sync keeps them on the same version
                patchPublishInfo(
                    layerDraft,
                    id,
                    publishInfo,
                    isInSync ? ['draft', 'master'] : ['draft']
                );
                result.updated++;
            } catch (e) {
                result.failed++;
                logger.error(`Failed to backfill publish info for ${id} in ${repoId} - ${e}`);
            }
        });
    }

    logger.info(`Backfilled publish info in ${repoId}: ${JSON.stringify(result)}`);

    return result;
};

// Sets publish info on inherited layer content which was published before XP8. Safe to run
// multiple times, as content with correct publish info is left unchanged.
export const backfillLayerPublishInfo = () => {
    const { localeToRepoIdMap } = getLayersData();

    logger.info('Starting job to backfill publish info for inherited layer content');

    toggleCacheInvalidationOnNodeEvents({ shouldDefer: true, maxDeferTime: ONE_DAY_MS });

    try {
        Object.values(localeToRepoIdMap).forEach((repoId) => {
            if (repoId !== CONTENT_ROOT_REPO_ID) {
                backfillLayerRepo(repoId);
            }
        });
    } finally {
        toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });
    }

    logger.info('Finished job to backfill publish info for inherited layer content');
};
