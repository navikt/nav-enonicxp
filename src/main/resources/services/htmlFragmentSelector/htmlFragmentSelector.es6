const contentLib = require('/lib/xp/content');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');

const serviceName = __DIR__
    .split('/')
    .filter((str) => !!str)
    .slice(-1)[0];

const getSubPath = (req) =>
    req.path
        .split(serviceName)
        .slice(-1)[0]
        .replace(/(^\/)|(\/$)/, ''); // Trim leading/trailing slash

const getHtmlFragmentHits = (query) => {
    const htmlFragments = contentLib.query({
        ...(query && { query: `fulltext("displayName, _path", "${query}", "AND")` }),
        start: 0,
        count: 10000,
        contentTypes: ['portal:fragment'],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'components.part.descriptor',
                        values: ['no.nav.navno:html-area'],
                    },
                },
                mustNot: {
                    hasValue: {
                        field: 'components.type',
                        values: ['layout'],
                    },
                },
            },
        },
    }).hits;

    return htmlFragments.map((fragment) => ({
        id: fragment._id,
        displayName: fragment.displayName,
        description: fragment._path,
    }));
};

const getFragmentMacroUsage = (fragmentId) => {
    const contentWithMacro = findContentsWithFragmentMacro(fragmentId);

    const response = contentWithMacro.map((content) => ({
        name: content.displayName,
        path: content._path,
        id: content._id,
    }));

    return {
        status: 200,
        body: {
            usage: response,
        },
    };
};

const htmlFragmentSelector = (req) => {
    const { query, fragmentId } = req.params;

    const subPath = getSubPath(req);

    if (subPath === 'macroUsage') {
        return getFragmentMacroUsage(fragmentId);
    }

    const hits = getHtmlFragmentHits(query);

    return {
        status: 200,
        body: {
            total: hits.length,
            count: hits.length,
            hits: hits,
        },
    };
};

exports.get = htmlFragmentSelector;
