const contentLib = require('/lib/xp/content');
const cronLib = require('/lib/cron');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { forceArray } = require('/lib/nav-utils');
const { frontendOrigin } = require('/lib/headless/url-origin');

const batchCount = 1000;
const maxCount = 50000;
const pathPrefix = '/www.nav.no';

const sitemapData = {
    entries: {},
    clear: function () {
        this.entries = {};
    },
    get: function (key) {
        return this.entries[key];
    },
    set: function (key, value) {
        this.entries[key] = value;
    },
    remove: function (key) {
        delete this.entries[key];
    },
    getEntries: function () {
        return Object.values(this.entries);
    },
};

const includedContentTypes = [
    'dynamic-page',
    'main-article',
    'section-page',
    'page-list',
    'transport-page',
    'office-information',
    'publishing-calendar',
    'large-table',
].map((contentType) => `${app.name}:${contentType}`);

const isIncludedType = (type) =>
    !!includedContentTypes.find((includedType) => includedType === type);

const getUrl = (content) =>
    content.data?.canonicalUrl || content._path.replace(pathPrefix, frontendOrigin);

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
    const languageVersions = getAlternativeLanguageVersions(content);

    return {
        url: getUrl(content),
        modifiedTime: content.modifiedTime,
        language: content.language,
        ...(languageVersions?.length > 0 && { languageVersions }),
    };
};

const updateSitemapEntry = (pathname) => {
    const url = `${frontendOrigin}${pathname}`;
    const content = runInBranchContext(() => contentLib.get({ key: url }), 'master');
    if (content && isIncludedType(content.type)) {
        sitemapData.set(url, getSitemapEntry(content));
    } else if (sitemapData.get(url)) {
        sitemapData.remove(url);
    }
};

const getSitemapEntries = (start = 0) => {
    const entriesBatch = contentLib
        .query({
            start,
            count: batchCount,
            contentTypes: includedContentTypes,
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
        .hits.map(getSitemapEntry);

    if (entriesBatch.length === batchCount) {
        return [...entriesBatch, ...getSitemapEntries(start + batchCount)];
    }

    return entriesBatch;
};

const getAllSitemapEntries = () => {
    return sitemapData.getEntries();
};

const generateSitemapData = () => {
    log.info('Started generating sitemap data');

    const startTime = Date.now();
    const sitemapEntries = getSitemapEntries();
    sitemapData.clear();

    sitemapEntries.forEach((entry) => {
        sitemapData.set(entry.url, entry);
    });

    log.info(
        `Finished generating sitemap data with ${sitemapEntries.length} entries after ${
            Date.now() - startTime
        }ms`
    );

    if (sitemapEntries.length > maxCount) {
        log.warning(`Sitemap entries count exceeds recommended maximum`);
    }
};

const generateSitemapDataAndScheduleRegeneration = () => {
    runInBranchContext(generateSitemapData, 'master');

    // Regenerate sitemap from scratch at 23:00 daily
    cronLib.schedule({
        name: 'sitemap-generator-schedule',
        cron: '0 23 * * *',
        context: {
            repository: 'com.enonic.cms.default',
            branch: 'master',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        callback: generateSitemapData,
    });
};

module.exports = {
    getAllSitemapEntries,
    generateSitemapDataAndScheduleRegeneration,
    updateSitemapEntry,
};
