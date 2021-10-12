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

const runQuery = ({ query, start, branch, types, returnFields }) => {
    const result = runInBranchContext(
        () =>
            contentLib.query({
                query: query || '_path LIKE "*"',
                start: start,
                count: batchMaxSize,
                contentTypes: types,
                filter: {
                    boolean: {
                        ...(branch === 'unpublished' && {
                            mustNot: {
                                exists: {
                                    field: 'publish.from',
                                },
                            },
                        }),
                    },
                },
            }),
        branch === 'published' ? 'master' : 'draft'
    );

    return returnFields
        ? {
              ...result,
              hits: result.hits.map((hit) =>
                  returnFields.reduce((acc, key) => {
                      const value = getNestedValue(hit, key);

                      return value
                          ? {
                                ...acc,
                                [key]: value,
                            }
                          : acc;
                  }, {})
              ),
          }
        : result;
};

const handleGet = (req) => {
    const { query, branch = 'published', start = 0, types, returnFields } = req.params;
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

    const fieldsParsed = returnFields ? parseJsonArray(returnFields) : [];
    if (!fieldsParsed) {
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

    if (!validBranches[branch]) {
        log.info(`Invalid branch specified: ${branch}`);
        return {
            status: 400,
            body: {
                message: `Invalid "branch"-parameter specified, must be one of ${Object.keys(
                    validBranches
                ).join(', ')}`,
            },
            contentType: 'application/json',
        };
    }

    const result = runQuery({
        query,
        branch,
        start,
        returnFields: fieldsParsed,
        types: typesParsed,
    });

    return {
        status: 200,
        body: result,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
