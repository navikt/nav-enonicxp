const contentLib = require('/lib/xp/content');
const { frontendOrigin } = require('/lib/headless/url-origin');

const includedContentTypes = [
    'dynamic-page',
    'main-article',
    'section-page',
    'page-list',
    'transport-page',
    'office-information',
    'publishing-calendar',
    'external-link',
].map((contentType) => `${app.name}:${contentType}`);

const includedMediaTypes = ['text'].map((mediaType) => `media:${mediaType}`);

const includedTypes = [...includedContentTypes, ...includedMediaTypes];

const getSitemapEntryData = (hit) => ({
    url: hit.data?.canonicalUrl || hit._path.replace('/www.nav.no', frontendOrigin),
    modifiedTime: hit.modifiedTime,
    language: hit.language,
});

const handleGet = (req) => {
    const { secret } = req.headers;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Unauthorized',
            },
            contentType: 'application/json',
        };
    }

    const result = contentLib
        .query({
            start: 0,
            count: 20000,
            contentTypes: includedTypes,
            query: '_path LIKE "/content/www.nav.no/*"',
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
        .hits.map(getSitemapEntryData);

    return {
        status: 200,
        body: result,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
