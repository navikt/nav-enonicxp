const contentLib = require('/lib/xp/content');
const taskLib = require('/lib/xp/task');
const cronLib = require('/lib/cron');
const eventLib = require('/lib/xp/event');
const clusterLib = require('/lib/xp/cluster');
const { isValidCustomPath } = require('/lib/custom-paths/custom-paths');
const { getContentFromCustomPath } = require('/lib/custom-paths/custom-paths');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { forceArray } = require('/lib/nav-utils');
const { frontendOrigin } = require('/lib/headless/url-origin');

const batchCount = 1000;
const maxCount = 50000;
const eventType = 'sitemap-generated';

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

const pageContentTypes = [
    'situation-page',
    'guide-page',
    'employer-situation-page',
    'dynamic-page',
    'content-page-with-sidemenus',
    'main-article',
    'section-page',
    'page-list',
    'transport-page',
    'office-information',
    'publishing-calendar',
    'large-table',
].map((contentType) => `${app.name}:${contentType}`);

const isIncludedType = (type) => !!pageContentTypes.find((includedType) => includedType === type);

const validateContent = (content) => {
    if (!content) {
        return false;
    }

    if (!isIncludedType(content.type)) {
        return false;
    }

    if (content.data?.externalProductUrl || content.data?.noindex) {
        return false;
    }

    return true;
};

const getUrl = (content) => {
    if (content.data?.canonicalUrl) {
        return content.data.canonicalUrl;
    }

    const customPath = content.data?.customPath;

    const pathname = isValidCustomPath(customPath)
        ? customPath
        : content._path.replace(/^\/www.nav.no/, '');
    return `${frontendOrigin}${pathname}`;
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
    const languageVersions = getAlternativeLanguageVersions(content);

    return {
        id: content._id,
        url: getUrl(content),
        modifiedTime: content.modifiedTime,
        language: content.language,
        ...(languageVersions?.length > 0 && { languageVersions }),
    };
};

const getContent = (path) => {
    const contentFromCustomPath = getContentFromCustomPath(path);
    if (contentFromCustomPath.length > 0) {
        if (contentFromCustomPath.length === 1) {
            return contentFromCustomPath[0];
        }
        log.warning(`Multiple entries found for custom path ${path} - skipping sitemap entry`);
        return null;
    }

    return runInBranchContext(() => contentLib.get({ key: path }), 'master');
};

const updateSitemapEntry = (path) => {
    const content = getContent(path);
    if (!content) {
        return;
    }

    const key = content._id;

    if (validateContent(content)) {
        sitemapData.set(key, getSitemapEntry(content));
    } else if (sitemapData.get(key)) {
        sitemapData.remove(key);
    }
};

const getSitemapEntries = (start = 0, previousEntries = []) => {
    const entriesBatch = contentLib
        .query({
            start,
            count: batchCount,
            contentTypes: pageContentTypes,
            filters: {
                boolean: {
                    mustNot: {
                        hasValue: {
                            field: 'data.noindex',
                            values: ['true'],
                        },
                        exists: {
                            field: 'data.externalProductUrl',
                        },
                    },
                },
            },
        })
        .hits.map(getSitemapEntry);

    const currentEntries = [...entriesBatch, ...previousEntries];

    if (entriesBatch.length < batchCount) {
        return currentEntries;
    }

    return getSitemapEntries(start + batchCount, currentEntries);
};

const getAllSitemapEntries = () => {
    return sitemapData.getEntries();
};

const generateSitemapData = () => {
    if (clusterLib.isMaster()) {
        taskLib.submit({
            description: 'sitemap-generator-task',
            task: () => {
                log.info('Started generating sitemap data');

                const startTime = Date.now();
                const sitemapEntries = getSitemapEntries();

                eventLib.send({
                    type: eventType,
                    distributed: true,
                    data: { entries: sitemapEntries },
                });

                log.info(
                    `Finished generating sitemap data with ${sitemapEntries.length} entries after ${
                        Date.now() - startTime
                    }ms`
                );

                if (sitemapEntries.length > maxCount) {
                    log.warning(`Sitemap entries count exceeds recommended maximum`);
                }
            },
        });
    }
};

const generateDataAndActivateSchedule = () => {
    runInBranchContext(generateSitemapData, 'master');

    // Regenerate sitemap from scratch at 06:00 daily
    cronLib.schedule({
        name: 'sitemap-generator-schedule',
        cron: '0 6 * * 1,2,3,4,5',
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

const updateSitemapData = (entries) => {
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
        log.info('Attempted to update sitemap with invalid data');
        return;
    }

    sitemapData.clear();

    entries.forEach((entry) => {
        sitemapData.set(entry.id, entry);
    });
};

const activateDataUpdateEventListener = () => {
    eventLib.listener({
        type: `custom.${eventType}`,
        callback: (event) => {
            log.info('Received sitemap data from master, updating...');
            updateSitemapData(event.data.entries);
        },
    });
};

module.exports = {
    getAllSitemapEntries,
    generateDataAndActivateSchedule,
    updateSitemapEntry,
    activateDataUpdateEventListener,
    pageContentTypes,
};
