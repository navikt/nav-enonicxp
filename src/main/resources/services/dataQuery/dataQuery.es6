const contentLib = require('/lib/xp/content');
const { getNestedValue } = require('/lib/nav-utils');
const { pageContentTypes } = require('/lib/sitemap/sitemap');
const { runInBranchContext } = require('/lib/headless/branch-context');

const batchMaxSize = 100000;

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
    all: true,
};

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

const runQuery = ({ query, start, branch, types, fieldKeys }) => {
    const result = runInBranchContext(
        () =>
            contentLib.query({
                query: query || '_path LIKE "*"',
                start: start,
                count: batchMaxSize,
                contentTypes: types,
                ...(branch === 'unpublished' && {
                    filter: {
                        boolean: {
                            mustNot: {
                                exists: {
                                    field: 'publish.from',
                                },
                            },
                        },
                    },
                }),
            }),
        branch === 'published' ? 'master' : 'draft'
    );

    return fieldKeys?.length > 0
        ? {
              ...result,
              hits: hitsWithRequestedFields(result.hits, fieldKeys),
          }
        : result;
};

const handleGet = (req) => {
    const { branch, query, types, fields, start = 0 } = req.params;
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

    const result = runQuery({
        query,
        branch,
        start,
        fieldKeys: fieldKeysParsed,
        types: typesParsed,
    });

    return {
        status: 200,
        body: {
            branch,
            ...(query && { query }),
            ...(typesParsed.length > 0 && { types: typesParsed }),
            ...(fieldKeysParsed.length > 0 && { fields: fieldKeysParsed }),
            start,
            count: result.count,
            total: result.total,
            hits: result.hits,
        },
        contentType: 'application/json',
    };
};

exports.get = handleGet;
