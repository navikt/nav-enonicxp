const contentLib = require('/lib/xp/content');
const { getNestedValue } = require('/lib/nav-utils');
const { pageContentTypes } = require('/lib/sitemap/sitemap');
const { runInBranchContext } = require('/lib/headless/branch-context');

const batchMaxSize = 1000;

const defaultTypes = pageContentTypes;

const validBranch = {
    published: true,
    unpublished: true,
    all: true,
};

const includedFieldKeys = [
    '_id',
    '_name',
    '_path',
    'createdTime',
    'modifiedTime',
    'publish.first',
    'publish.from',
    'type',
    'language',
    'displayName',
    'data.customPath',
];

const handleGet = (req) => {
    const { query, branch = 'published', start = 0, types = defaultTypes } = req.params;
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

    if (!validBranch[branch]) {
        log.info(`Invalid branch specified: ${branch}`);
        return {
            status: 400,
            body: {
                message: `Invalid "branch"-parameter specified, must be one of ${Object.keys(
                    validBranch
                ).join(', ')}`,
            },
            contentType: 'application/json',
        };
    }

    if (!query) {
        log.info(`Missing query`);
        return {
            status: 400,
            body: {
                message: 'Missing required parameter "query"',
            },
            contentType: 'application/json',
        };
    }

    if (!Array.isArray(types)) {
        log.info(`Invalid types array: not an array`);
        return {
            status: 400,
            body: {
                message: 'Parameter "types" must be an array',
            },
            contentType: 'application/json',
        };
    }

    const result = runInBranchContext(
        () =>
            contentLib.query({
                query,
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

    return {
        status: 200,
        body: {
            ...result,
            hits: result.hits.map((hit) =>
                includedFieldKeys.reduce((acc, key) => {
                    const value = getNestedValue(hit, key);

                    return value
                        ? {
                              ...acc,
                              [key]: value,
                          }
                        : acc;
                }, {})
            ),
        },
        contentType: 'application/json',
    };
};

exports.get = handleGet;
