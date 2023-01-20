import cacheLib from '/lib/cache';
import * as nodeLib from '/lib/xp/node';
import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { parseJsonArray } from '../../lib/utils/nav-utils';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { batchedContentQuery, batchedNodeQuery } from '../../lib/utils/batched-query';
import { contentTypesInDataQuery } from '../../lib/contenttype-lists';
import { logger } from '../../lib/utils/logging';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';

type Branch = 'published' | 'unpublished' | 'archived';

type RunQueryParams = {
    requestId: string;
    branch: Branch;
    query?: string;
    batch: number;
    types?: ContentDescriptor[];
};

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

const getContentIdsFromQuery = ({ query, branch, types, requestId }: RunQueryParams) => {
    const result = batchedNodeQuery({
        repoParams: {
            repoId: 'com.enonic.cms.default',
            branch: branch === 'published' ? 'master' : 'draft',
        },
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
                    ...(branch === 'unpublished' && {
                        mustNot: {
                            exists: {
                                field: 'publish.from',
                            },
                        },
                    }),
                },
            },
        },
    })
        .hits.map((hit) => hit.id)
        .sort();

    logger.info(`Data query: Total hits for request ${requestId}: ${result.length}`);

    return result;
};

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

const runArchiveQuery = (contentIdsBatch: string[]) => {
    const repo = nodeLib.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'draft',
    });

    const result = repo.get<RepoNode<Content>>(contentIdsBatch);

    if (!result) {
        return [];
    }

    if (!Array.isArray(result)) {
        return [transformRepoNode(result)];
    }

    return result.map((hit) => transformRepoNode(hit));
};

const runContentQuery = (contentIdsBatch: string[]) => {
    return batchedContentQuery({
        count: RESPONSE_BATCH_SIZE,
        filters: {
            ids: {
                values: contentIdsBatch,
            },
        },
    }).hits;
};

const runQuery = (params: RunQueryParams) => {
    const { requestId, batch, branch } = params;

    const contentIds = contentIdsCache.get(requestId, () => getContentIdsFromQuery(params));

    const start = batch * RESPONSE_BATCH_SIZE;
    const end = start + RESPONSE_BATCH_SIZE;

    const contentIdsBatch = contentIds.slice(start, end);

    const hits =
        branch === 'archived' ? runArchiveQuery(contentIdsBatch) : runContentQuery(contentIdsBatch);

    if (hits.length !== contentIdsBatch.length) {
        const diff = contentIdsBatch.filter((id) => !hits.find((hit) => hit._id === id));
        logger.warning(
            `Data query: missing results from contentLib query for ${
                diff.length
            } ids: ${JSON.stringify(diff)}`
        );
    }

    return {
        hits,
        total: contentIds.length,
        hasMore: contentIds.length > end,
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

    const typesParsed = types ? parseJsonArray(types) : contentTypesInDataQuery;
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

        const result = runInBranchContext(
            () =>
                runQuery({
                    requestId,
                    query,
                    branch,
                    batch: Number(batch),
                    types: typesParsed,
                }),
            branch === 'published' ? 'master' : 'draft'
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
