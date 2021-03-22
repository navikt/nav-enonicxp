const contentLib = require('/lib/xp/content');
const taskLib = require('/lib/xp/task');
const cronLib = require('/lib/cron');
const { forceArray } = require('/lib/nav-utils');
const { frontendOrigin } = require('/lib/headless/url-origin');

let sitemapDataCache = null;
const tenMinutesInMs = 60 * 10 * 1000;

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

        return altContent?.language
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

const generateSitemapData = () => {
    log.info('Generating sitemap...');

    sitemapDataCache = contentLib
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

    log.info('Finished generating sitemap');
};

const getSitemapData = () => {
    if (!sitemapDataCache) {
        generateSitemapData();
    }

    return sitemapDataCache;
};

const startSitemapGeneratorSchedule = () => {
    cronLib.schedule({
        name: 'sitemap-generator-schedule',
        fixedDelay: tenMinutesInMs,
        callback: taskLib.submit({
            description: 'sitemap-generator-task',
            task: generateSitemapData,
        }),
    });
};

module.exports = { getSitemapData, startSitemapGeneratorSchedule };
