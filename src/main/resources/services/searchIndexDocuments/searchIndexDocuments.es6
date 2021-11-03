const contentLib = require('/lib/xp/content');
const { getExternalUrl } = require('/lib/sitemap/sitemap');

// Temporary service for populating an external search index
const searchIndexDocuments = () => {
    const result = contentLib
        .query({
            start: 0,
            count: 1000,
            contentTypes: ['no.nav.navno:main-article'],
            filters: {
                boolean: {
                    mustNot: {
                        hasValue: {
                            field: 'data.noindex',
                            values: ['true'],
                        },
                    },
                },
            },
        })
        .hits.map((hit) => ({
            id: hit._id,
            url: getExternalUrl(hit),
            header: hit.displayName,
            description: hit.metaDescription,
            content: hit.data.text,
            keywords: hit.data.keywords,
        }));

    return {
        status: 200,
        contentType: 'application/json',
        body: { documents: result },
    };
};

exports.get = searchIndexDocuments;
