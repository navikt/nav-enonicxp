import {
    RepoIdNodeIdBuckets,
    sortMultiRepoNodeHitsToBuckets,
} from '../../../lib/localization/layers-repo-utils/sort-and-resolve-hits';
import { getLayersData } from '../../../lib/localization/layers-data';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { getPublicPath } from '../../../lib/paths/public-path';
import { getRepoConnection } from '../../../lib/repos/repo-utils';
import { RunQueryParams, ContentWithLocaleData } from './types';
import { batchedContentQuery } from '../../../lib/utils/batched-query';
import { getNodeHitsFromQuery } from './queryBuilder';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import cacheLib from '/lib/cache';
import { logger } from '../../../lib/utils/logging';

const RESPONSE_BATCH_SIZE = 1000;

// Cache the content-ids on the initial request, to ensure batched responses are consistent
const contentIdsCache = cacheLib.newCache({
    size: 10,
    expire: 600,
});

const transformRepoNode = (node: RepoNode<Content>): Content => {
    const {
        _childOrder,
        _indexConfig,
        _inheritsPermissions,
        _permissions,
        _state,
        _nodeType,
        ...content
    } = node;

    return content;
};

const runArchiveQuery = (nodeHitsBuckets: RepoIdNodeIdBuckets) => {
    const { repoIdToLocaleMap } = getLayersData();

    return Object.entries(nodeHitsBuckets).reduce<ContentWithLocaleData[]>(
        (acc, [repoId, nodeIds]) => {
            const locale = repoIdToLocaleMap[repoId];

            const repo = getRepoConnection({
                repoId,
                branch: 'draft',
            });

            const result = repo.get<RepoNode<Content>>(nodeIds);
            if (!result) {
                return acc;
            }

            const hits = Array.isArray(result)
                ? result.map(transformRepoNode)
                : [transformRepoNode(result)];

            const hitsWithRepoIds = hits.map((content) => ({
                ...content,
                layerLocale: locale,
                publicPath: getPublicPath(content, locale),
            }));

            return [...acc, ...hitsWithRepoIds];
        },
        []
    );
};

const runContentQuery = (nodeHitsBuckets: RepoIdNodeIdBuckets) => {
    const { repoIdToLocaleMap } = getLayersData();

    return Object.entries(nodeHitsBuckets).reduce<ContentWithLocaleData[]>(
        (acc, [repoId, nodeIds]) => {
            const locale = repoIdToLocaleMap[repoId];

            const result = runInLocaleContext({ locale }, () =>
                batchedContentQuery({
                    count: RESPONSE_BATCH_SIZE,
                    filters: {
                        ids: {
                            values: nodeIds,
                        },
                    },
                })
            );

            const hitsWithRepoIds = result.hits.map((content) => {
                return {
                    ...content,
                    layerLocale: locale,
                    publicPath: getPublicPath(content, locale),
                };
            });

            return [...acc, ...hitsWithRepoIds];
        },
        []
    );
};

export const runQuery = (params: RunQueryParams) => {
    const { requestId, batch, branch } = params;

    const nodeHits = contentIdsCache.get(requestId, () => getNodeHitsFromQuery(params));

    const start = batch * RESPONSE_BATCH_SIZE;
    const end = start + RESPONSE_BATCH_SIZE;

    const nodeHitsBatch = nodeHits.slice(start, end);
    const nodeHitsBuckets = sortMultiRepoNodeHitsToBuckets({ hits: nodeHitsBatch });

    const contentHits =
        branch === 'archived' ? runArchiveQuery(nodeHitsBuckets) : runContentQuery(nodeHitsBuckets);

    if (contentHits.length !== nodeHitsBatch.length) {
        const diff = nodeHitsBatch.filter(
            (node) => !contentHits.find((hit) => hit._id === node.id)
        );
        logger.warning(
            `Data query: missing results from content query for ${
                diff.length
            } ids: ${JSON.stringify(diff)}`
        );
    }

    return {
        hits: contentHits,
        total: nodeHits.length,
        hasMore: nodeHits.length > end,
    };
};