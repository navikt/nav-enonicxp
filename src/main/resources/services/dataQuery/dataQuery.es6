const cacheLib = require('/lib/cache');
const contentLib = require('/lib/xp/content');
const nodeLib = require('/lib/xp/node');
const { parseJsonArray } = require('/lib/utils/nav-utils');
const { getNestedValue } = require('/lib/utils/nav-utils');
const { sitemapContentTypes } = require('/lib/sitemap/sitemap');
const { runInBranchContext } = require('/lib/utils/branch-context');

const batchSize = 1000;

const defaultTypes = [
    ...sitemapContentTypes,
    'media:text',
    'media:document',
    'media:spreadsheet',
    'media:presentation',
];

const validBranches = {
    published: true,
    unpublished: true,
};

// Cache the content-ids per request on the first batch, to ensure batched responses are consistent
const contentIdsCache = cacheLib.newCache({
    size: 10,
    expire: 3600,
});

const hitsWithRequestedFields = (hits, fieldKeys) =>
    fieldKeys?.length > 0
        ? hits.map((hit) =>
              fieldKeys.reduce((acc, key) => {
                  const value = getNestedValue(hit, key);

                  return value
                      ? {
                            ...acc,
                            [key]: value,
                        }
                      : acc;
              }, {})
          )
        : hits;

const getContentIdsFromQuery = ({ query, branch, types, requestId }) => {
    const repo = nodeLib.connect({
        repoId: 'com.enonic.cms.default',
        branch: branch === 'published' ? 'master' : 'draft',
    });

    const result = repo
        .query({
            ...(query && { query }),
            start: 0,
            count: 100000,
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'type',
                            values: types,
                        },
                    },
                    ...(branch === 'unpublished' && {
                        mustNot: {
                            exists: {
                                field: 'publish.from',
                            },
                        },
                    }),
                },
            },
        })
        .hits.map((hit) => hit.id)
        .sort();

    log.info(`Data query: Total hits for request ${requestId}: ${result.length}`);

    return result;
};

const runQuery = ({ requestId, query, batch, branch, types, fieldKeys }) => {
    const contentIds = contentIdsCache.get(requestId, () =>
        getContentIdsFromQuery({
            query,
            branch,
            types,
            requestId,
        })
    );

    const start = batch * batchSize;
    const end = start + batchSize;

    const contentIdsBatch = contentIds.slice(start, end);

    const result = contentLib.query({
        start: 0,
        count: 100000,
        filters: {
            ids: {
                values: contentIdsBatch,
            },
        },
    });

    if (result.hits.length !== contentIdsBatch.length) {
        const diff = contentIdsBatch.filter((id) => !result.hits.find((hit) => hit._id === id));
        log.info(
            `Data query: missing results from contentLib query for ${
                diff.length
            } ids: ${JSON.stringify(diff)}`
        );
    }

    return {
        ...result,
        hits: hitsWithRequestedFields(result.hits, fieldKeys),
        total: contentIds.length,
        hasMore: contentIds.length > end,
    };
};

const handleGet = (req) => {
    const { secret } = req.headers;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const { branch, requestId, query, types, fields, batch = 0 } = req.params;

    if (!requestId) {
        log.info('No request id specified');
        return {
            status: 400,
            body: {
                message: 'Missing parameter "requestId"',
            },
            contentType: 'application/json',
        };
    }

    if (!validBranches[branch]) {
        log.info(`Invalid branch specified: ${branch}`);
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

    const fieldKeysParsed = fields ? parseJsonArray(fields) : [];
    if (!fieldKeysParsed) {
        return {
            status: 400,
            body: {
                message: 'Invalid type for argument "fields"',
            },
            contentType: 'application/json',
        };
    }

    const typesParsed = types ? parseJsonArray(types) : defaultTypes;
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
        log.info(`Data query: running query for request id ${requestId}, batch ${batch}`);

        const result = runInBranchContext(
            () =>
                runQuery({
                    requestId,
                    query,
                    branch,
                    batch,
                    fieldKeys: fieldKeysParsed,
                    types: typesParsed,
                }),
            branch === 'published' ? 'master' : 'draft'
        );

        log.info(
            `Data query: successfully ran query batch for request id ${requestId}, batch ${batch}`
        );

        return {
            status: 200,
            body: {
                requestId,
                branch,
                ...(query && { query }),
                ...(typesParsed.length > 0 && { types: typesParsed }),
                ...(fieldKeysParsed.length > 0 && { fields: fieldKeysParsed }),
                total: result.total,
                hits: result.hits,
                hasMore: result.hasMore,
            },
            contentType: 'application/json',
        };
    } catch (e) {
        log.error(
            `Data query: error while running query for request id ${requestId}, batch ${batch} - ${e}`
        );

        return {
            status: 500,
            body: {
                message: `Query error for request id ${requestId} - ${e}`,
            },
            contentType: 'application/json',
        };
    }
};

exports.get = handleGet;
