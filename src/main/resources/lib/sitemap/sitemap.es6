const contentLib = require('/lib/xp/content');
const taskLib = require('/lib/xp/task');
const cronLib = require('/lib/cron');
const cacheLib = require('/lib/cache');
const { forceArray } = require('/lib/nav-utils');
const { frontendOrigin } = require('/lib/headless/url-origin');

const cacheKey = 'sitemap';
const tenMinutesInMs = 60 * 10 * 1000;
const oneHourInSeconds = 3600;

const cache = cacheLib.newCache({
    size: 1,
    expire: oneHourInSeconds,
});

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

const navUrlPattern = new RegExp('^https:\\/\\/([a-z0-9_.-]+\\.)?nav\\.no', 'i');

const isNavUrl = (url) => navUrlPattern.test(url);

const getUrl = (content) => {
    if (content.type.endsWith('external-link')) {
        const url = content.data?.url;
        return isNavUrl(url) ? url : null;
    }

    return content.data?.canonicalUrl || content._path.replace('/www.nav.no', frontendOrigin);
};

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

const getSitemapEntry = (content) => {
    const url = getUrl(content);

    if (!url) {
        return null;
    }

    const languageVersions = getAlternativeLanguageVersions(content);

    return {
        url,
        modifiedTime: content.modifiedTime,
        language: content.language,
        ...(languageVersions?.length > 0 && { languageVersions }),
    };
};

const generateSitemapData = () => {
    log.info('Generating sitemap...');

    const sitemapData = contentLib
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
        .hits.reduce((acc, content) => {
            const entry = getSitemapEntry(content);
            return entry ? [...acc, entry] : acc;
        }, []);

    log.info('Finished generating sitemap');

    return sitemapData;
};

const getSitemapData = () => cache.get(cacheKey, generateSitemapData);

const regenerateCache = () => {
    const sitemapData = generateSitemapData();
    cache.remove(cacheKey);
    cache.get(cacheKey, () => sitemapData);
};

const startRegeneratingSchedule = () => {
    cronLib.schedule({
        name: 'sitemap-generator-schedule',
        fixedDelay: tenMinutesInMs,
        callback: () =>
            taskLib.submit({
                description: 'sitemap-generator-task',
                task: regenerateCache,
            }),
    });
};

module.exports = { getSitemapData, startRegeneratingSchedule };
