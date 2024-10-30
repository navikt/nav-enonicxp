import cacheLib from '/lib/cache';
import { getRepoConnection } from '../../lib/utils/repo-utils';
import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { runInContext } from '../../lib/context/run-in-context';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { batchedContentQuery, batchedMultiRepoNodeQuery } from '../../lib/utils/batched-query';
import { contentTypesInDataQuery } from '../../lib/contenttype-lists';
import { logger } from '../../lib/utils/logging';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import {
    RepoIdNodeIdBuckets,
    sortMultiRepoNodeHitsToBuckets,
} from '../../lib/localization/layers-repo-utils/sort-and-resolve-hits';
import { getLayersData } from '../../lib/localization/layers-data';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { getPublicPath } from '../../lib/paths/public-path';
import { parseJsonToArray } from '../../lib/utils/array-utils';
import { getLayersMultiConnection } from '../../lib/localization/layers-repo-utils/layers-repo-connection';
import { transformRepoContentNode } from '../../lib/utils/content-utils';

type Branch = 'published' | 'unpublished' | 'archived';

type RunQueryParams = {
    requestId: string;
    branch: Branch;
    query?: string;
    batch: number;
    types?: ContentDescriptor[];
};

type ContentWithLocaleData = Content & { layerLocale: string; publicPath: string };

const RESPONSE_BATCH_SIZE = 1000;

const validBranches: { [key in Branch]: boolean } = {
    published: true,
    unpublished: true,
    archived: true,
};

const branchIsValid = (branch: string): branch is Branch => validBranches[branch as Branch];

// Cache the content-ids on the initial request, to ensure batched responses are consistent
const contentIdsCache = cacheLib.newCache({
    size: 10,
    expire: 600,
});

const buildQuery = (queryStrings: (string | undefined)[]) =>
    queryStrings.filter(Boolean).join(' AND ');

const getNodeHitsFromQuery = ({ query, branch, types, requestId }: RunQueryParams) => {
    const repoBranch = branch === 'published' ? 'master' : 'draft';

    const repoConnection = getLayersMultiConnection(repoBranch);

    const result = batchedMultiRepoNodeQuery({
        repo: repoConnection,
        queryParams: {
            query:
                buildQuery([
                    query,
                    `_path LIKE ${branch === 'archived' ? '"/archive/*"' : '"/content/*"'}`,
                ]) || undefined,
            start: 0,
            count: 100000,
            filters: {
                boolean: {
                    ...(types && {
                        must: {
                            hasValue: {
                                field: 'type',
                                values: types,
                            },
                        },
                    }),
                    mustNot: [
                        {
                            hasValue: {
                                field: 'inherit',
                                values: ['CONTENT'],
                            },
                        },
                        ...(branch === 'unpublished'
                            ? [
                                  {
                                      exists: {
                                          field: 'publish.from',
                                      },
                                  },
                              ]
                            : []),
                    ],
                },
            },
        },
    }).hits;

    logger.info(`Data query: Total hits for request ${requestId}: ${result.length}`);

    return result;
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
                ? result.map(transformRepoContentNode)
                : [transformRepoContentNode(result)];

            const hitsWithRepoIds = hits.map((content) => {
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

const runQuery = (params: RunQueryParams) => {
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

let rejectUntilTime = 0;
const timeoutPeriodMs = 1000 * 60 * 5;

export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    // This circuit breaker is triggered if a query throws an unexpected error.
    // Prevents database errors from accumulating and crashing the server :)
    const time = Date.now();
    if (time < rejectUntilTime) {
        return {
            status: 503,
            body: {
                message: `Service unavailable for ${(rejectUntilTime - time) / 1000} seconds`,
            },
            contentType: 'application/json',
        };
    }

    const { branch, requestId, query, types, batch = 0 } = req.params;

    if (!requestId) {
        logger.info('No request id specified');
        return {
            status: 400,
            body: {
                message: 'Missing parameter "requestId"',
            },
            contentType: 'application/json',
        };
    }

    if (!branch || !branchIsValid(branch)) {
        logger.info(`Invalid branch specified: ${branch}`);
        return {
            status: 400,
            body: {
                message: `Invalid or missing parameter "branch" - must be one of ${Object.keys(
                    validBranches
                ).join(', ')}`,
            },
            contentType: 'application/json',
        };
    }

    const typesParsed = types
        ? parseJsonToArray<ContentDescriptor>(types)
        : contentTypesInDataQuery;
    if (!typesParsed) {
        return {
            status: 400,
            body: {
                message: 'Invalid type for argument "array"',
            },
            contentType: 'application/json',
        };
    }

    try {
        logger.info(`Data query: running query for request id ${requestId}, batch ${batch}`);

        const result = runInContext({ branch: branch === 'published' ? 'master' : 'draft' }, () =>
            runQuery({
                requestId,
                query,
                branch,
                batch: Number(batch),
                types: typesParsed,
            })
        );

        logger.info(
            `Data query: successfully ran query batch for request id ${requestId}, batch ${batch}`
        );

        return {
            status: 200,
            body: {
                requestId,
                branch,
                ...(query && { query }),
                ...(typesParsed.length > 0 && { types: typesParsed }),
                total: result.total,
                hits: result.hits,
                hasMore: result.hasMore,
            },
            contentType: 'application/json',
        };
    } catch (e) {
        logger.error(
            `Data query: error while running query for request id ${requestId}, batch ${batch} - ${e}`
        );

        rejectUntilTime = Date.now() + timeoutPeriodMs;

        return {
            status: 500,
            body: {
                message: `Query error for request id ${requestId} - ${e}`,
            },
            contentType: 'application/json',
        };
    }
};
