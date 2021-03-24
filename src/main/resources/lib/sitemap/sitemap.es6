const contentLib = require('/lib/xp/content');
const taskLib = require('/lib/xp/task');
const cronLib = require('/lib/cron');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { forceArray } = require('/lib/nav-utils');
const { frontendOrigin } = require('/lib/headless/url-origin');

const batchCount = 50000;
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
    const path = `${pathPrefix}${pathname}`;
    const content = runInBranchContext(() => contentLib.get({ key: path }), 'master');
    if (content && isIncludedType(content.type)) {
        log.info(`updating sitemap entry for ${content._path}`);
        sitemapData.set(path, getSitemapEntry(content));
    } else if (sitemapData.get(path)) {
        log.info(`deleting sitemap entry for ${path}`);
        sitemapData.remove(path);
    }
};

const getSitemapContent = (start = 0) => {
    const queryHits = contentLib.query({
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
    }).hits;

    if (queryHits.length === batchCount) {
        log.info(`Additional query iterations needed after ${start + batchCount} hits`);
        return [...queryHits, ...getSitemapContent(start + batchCount)];
    }

    return queryHits;
};

const getAllSitemapEntries = () => {
    return sitemapData.getEntries();
};

const generateSitemapData = () =>
    taskLib.submit({
        description: 'sitemap-generator-task',
        task: () => {
            log.info('Started generating sitemap data');

            const startTime = Date.now();
            const sitemapContent = getSitemapContent();
            sitemapData.clear();

            sitemapContent.forEach((content) => {
                sitemapData.set(content._path, getSitemapEntry(content));
            });

            log.info(
                `Finished generating sitemap data with ${sitemapContent.length} entries after ${
                    Date.now() - startTime
                }ms`
            );
        },
    });

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
