const contentLib = require('/lib/xp/content');
const { forceArray } = require('/lib/nav-utils');
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

const getUrl = (content) =>
    content.data?.canonicalUrl || content._path.replace('/www.nav.no', frontendOrigin);

const getAlternativeLanguageVersions = (content) =>
    content.data?.languages &&
    forceArray(content.data.languages).reduce((acc, id) => {
        const altContent = contentLib.get({ key: id });

        return altContent
            ? [
                  ...acc,
                  {
                      language: altContent.language,
                      url: getUrl(altContent),
                  },
              ]
            : acc;
    }, []);

const getSitemapDataForContent = (content) => {
    const languageVersions = getAlternativeLanguageVersions(content);

    return {
        url: getUrl(content),
        modifiedTime: content.modifiedTime,
        language: content.language,
        ...(languageVersions?.length > 0 && { languageVersions }),
    };
};

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
        .hits.map(getSitemapDataForContent);

    return {
        status: 200,
        body: result,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
