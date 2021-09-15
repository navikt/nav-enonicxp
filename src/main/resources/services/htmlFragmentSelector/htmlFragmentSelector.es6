const contentLib = require('/lib/xp/content');
const { appendMacroDescriptionToKey } = require('/lib/headless/component-utils');
const { findContentsWithFragmentComponent } = require('/lib/headless/component-utils');
const { getSubPath } = require('../service-utils');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');

const selectorHandler = (req) => {
    const { query, withDescription } = req.params;

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
                    exists: {
                        field: 'components.layout',
                    },
                },
            },
        },
    }).hits;

    return htmlFragments.map((fragment) => ({
        id: withDescription
            ? appendMacroDescriptionToKey(fragment._id, fragment.displayName)
            : fragment._id,
        displayName: fragment.displayName,
        description: fragment._path,
    }));
};

const transformContentToResponseData = (contentArray) => {
    return contentArray.map((content) => ({
        name: content.displayName,
        path: content._path,
        id: content._id,
    }));
};

const getFragmentUsage = (req) => {
    const { fragmentId } = req.params;

    if (!fragmentId) {
        return {
            status: 400,
            body: {
                message: 'Invalid fragmentUsage request: missing parameter "fragmentId"',
            },
        };
    }

    const contentWithMacro = findContentsWithFragmentMacro(fragmentId);
    const contentWithComponent = findContentsWithFragmentComponent(fragmentId);

    return {
        status: 200,
        body: {
            macroUsage: transformContentToResponseData(contentWithMacro),
            componentUsage: transformContentToResponseData(contentWithComponent),
        },
    };
};

const htmlFragmentSelector = (req) => {
    const subPath = getSubPath(req);

    if (subPath === 'fragmentUsage') {
        return getFragmentUsage(req);
    }

    const hits = selectorHandler(req);

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
