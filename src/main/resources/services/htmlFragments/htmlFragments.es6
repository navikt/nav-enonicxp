const contentLib = require('/lib/xp/content');

const getHtmlFragmentHits = () => {
    const htmlFragments = contentLib.query({
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

const htmlFragmentSelector = () => {
    const hits = getHtmlFragmentHits();

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
