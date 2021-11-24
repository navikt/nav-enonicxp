const cacheLib = require('/lib/cache');
const contentLib = require('/lib/xp/content');
const { getNestedValue } = require('/lib/nav-utils');
const { pageContentTypes } = require('/lib/sitemap/sitemap');
const { runInBranchContext } = require('/lib/headless/branch-context');

const batchMaxSize = 1000;

const defaultTypes = [
    ...pageContentTypes,
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
const contentIdCacheByRequest = cacheLib.newCache({
    size: 10,
    expire: 3600,
});

const parseJsonArray = (str) => {
    try {
        const array = JSON.parse(str);
        if (Array.isArray(array)) {
            return array;
        }
        return null;
    } catch (e) {
        log.info(`Failed to parse JSON string - ${e}`);
        return null;
    }
};

const hitsWithRequestedFields = (hits, fieldKeys) =>
    hits.map((hit) =>
        fieldKeys.reduce((acc, key) => {
            const value = getNestedValue(hit, key);

            return value
                ? {
                      ...acc,
                      [key]: value,
                  }
                : acc;
        }, {})
    );

const getContentIdsFromQuery = ({ query, branch, types }) => {
    return contentLib
        .query({
            ...(query && { query }),
            start: 0,
            count: 100000,
            contentTypes: types,
            ...(branch === 'unpublished' && {
                filters: {
                    boolean: {
                        mustNot: {
                            exists: {
                                field: 'publish.from',
                            },
                        },
                    },
                },
            }),
        })
        .hits.map((hit) => hit._id);
};

const runQuery = ({ requestId, query, start, branch, types, fieldKeys }) => {
    const contentIds = contentIdCacheByRequest.get(requestId, () =>
        getContentIdsFromQuery({
            query,
            branch,
            types,
        })
    );

    const contentIdsBatch = contentIds.slice(start, start + batchMaxSize);

    const result = contentLib.query({
        count: batchMaxSize,
        filters: {
            ids: {
                values: contentIdsBatch,
            },
        },
    });

    const hits =
        fieldKeys?.length > 0 ? hitsWithRequestedFields(result.hits, fieldKeys) : result.hits;

    return {
        ...result,
        hits,
        total: contentIds.length,
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

    const { branch, requestId, query, types, fields, start = 0 } = req.params;

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
        log.info(`Data query: running query for request id ${requestId}, start index ${start}`);

        const result = runInBranchContext(
            () =>
                runQuery({
                    requestId,
                    query,
                    branch,
                    start,
                    fieldKeys: fieldKeysParsed,
                    types: typesParsed,
                }),
            branch === 'published' ? 'master' : 'draft'
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
            },
            contentType: 'application/json',
        };
    } catch (e) {
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
