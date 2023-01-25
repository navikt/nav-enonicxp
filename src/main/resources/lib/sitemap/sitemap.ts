import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as taskLib from '/lib/xp/task';
import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { getContentFromCustomPath, isValidCustomPath } from '../custom-paths/custom-paths';
import { forceArray, stripPathPrefix } from '../utils/nav-utils';
import { runInContext } from '../context/run-in-context';
import { contentRootRepoId, urls } from '../constants';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { addReliableEventListener, sendReliableEvent } from '../events/reliable-custom-events';
import { contentTypesInSitemap } from '../contenttype-lists';
import { logger } from '../utils/logging';

const batchCount = 1000;
const maxCount = 50000;
const eventTypeSitemapGenerated = 'sitemap-generated';
const eventTypeSitemapRequested = 'sitemap-requested';

type LanguageVersion = {
    language: string;
    url: string;
};

type SitemapEntry = {
    id: string;
    url: string;
    modifiedTime: string;
    language?: string;
    languageVersions?: LanguageVersion[];
};

type SitemapData = {
    entries: { [key: string]: SitemapEntry };
    clear: () => void;
    get: (key: string) => SitemapEntry;
    set: (key: string, value: SitemapEntry) => void;
    remove: (key: string) => void;
    getEntries: () => SitemapEntry[];
};

let isGenerating = false;

const sitemapData: SitemapData = {
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

const isIncludedType = (type: string) =>
    contentTypesInSitemap.some((includedType) => includedType === type);

const shouldIncludeContent = (content: Content<any>) =>
    content &&
    isIncludedType(content.type) &&
    !content.data?.externalProductUrl &&
    !content.data?.noindex;

const getUrl = (content: Content<any>) => {
    if (content.data?.canonicalUrl) {
        return content.data.canonicalUrl;
    }

    const customPath = content.data?.customPath;

    const pathname = isValidCustomPath(customPath) ? customPath : stripPathPrefix(content._path);
    return `${urls.frontendOrigin}${pathname}`;
};

const getAlternativeLanguageVersions = (content: Content<any>): LanguageVersion[] | undefined =>
    content.data?.languages &&
    forceArray(content.data.languages).reduce((acc, id) => {
        try {
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
        } catch (e) {
            logger.error(
                `Could not retrieve alt language content for sitemap - root id: ${content._id} - alt id: ${id} - Error: ${e}`
            );
            return acc;
        }
    }, []);

const getSitemapEntry = (content: Content): SitemapEntry => {
    const languageVersions = getAlternativeLanguageVersions(content);

    return {
        id: content._id,
        url: getUrl(content),
        modifiedTime: content.modifiedTime,
        language: content.language,
        ...(languageVersions && languageVersions.length > 0 && { languageVersions }),
    };
};

const getContent = (path: string) => {
    const contentFromCustomPath = getContentFromCustomPath(path);
    if (contentFromCustomPath.length > 0) {
        if (contentFromCustomPath.length === 1) {
            return contentFromCustomPath[0];
        }
        logger.critical(`Multiple entries found for custom path ${path} - skipping sitemap entry`);
        return null;
    }

    return runInContext({ branch: 'master' }, () => contentLib.get({ key: path }));
};

const updateSitemapEntry = (path: string) =>
    runInContext({ branch: 'master' }, () => {
        const content = getContent(path);
        if (!content) {
            return;
        }

        const key = content._id;

        if (shouldIncludeContent(content)) {
            sitemapData.set(key, getSitemapEntry(content));
        } else if (sitemapData.get(key)) {
            sitemapData.remove(key);
        }
    });

const getSitemapEntries = (start = 0, previousEntries: SitemapEntry[] = []): SitemapEntry[] => {
    const entriesBatch = contentLib
        .query({
            start,
            count: batchCount,
            contentTypes: contentTypesInSitemap,
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

export const getAllSitemapEntries = () => {
    return sitemapData.getEntries();
};

const generateAndBroadcastSitemapData = () => {
    if (!clusterLib.isMaster() || isGenerating) {
        return;
    }

    isGenerating = true;

    runInContext({ branch: 'master' }, () => {
        taskLib.executeFunction({
            description: 'sitemap-generator-task',
            func: () => {
                try {
                    logger.info('Started generating sitemap data');
                    const startTime = Date.now();
                    const sitemapEntries = getSitemapEntries();

                    sendReliableEvent({
                        type: eventTypeSitemapGenerated,
                        data: { entries: sitemapEntries },
                    });

                    logger.info(
                        `Finished generating sitemap data with ${
                            sitemapEntries.length
                        } entries after ${Date.now() - startTime}ms`
                    );

                    if (sitemapEntries.length > maxCount) {
                        logger.error(`Sitemap entries count exceeds recommended maximum`);
                    }
                } catch (e) {
                    logger.critical(`Error while generating sitemap - ${e}`);
                } finally {
                    isGenerating = false;
                }
            },
        });
    });
};

export const generateSitemapDataAndActivateSchedule = () => {
    generateAndBroadcastSitemapData();

    // Regenerate sitemap from scratch at 06:00 daily
    createOrUpdateSchedule({
        jobName: 'sitemap-generator-schedule',
        jobDescription: 'Generate sitemap data',
        jobSchedule: {
            type: 'CRON',
            value: '0 6 * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: 'no.nav.navno:sitemap-generator',
        taskConfig: {},
    });
};

const updateSitemapData = (entries: SitemapEntry[]) => {
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
        logger.error('Attempted to update sitemap with invalid data');
        return;
    }

    sitemapData.clear();

    entries.forEach((entry) => {
        sitemapData.set(entry.id, entry);
    });

    logger.info(`Updated sitemap data with ${entries.length} entries`);
};

export const requestSitemapUpdate = () => {
    sendReliableEvent({
        type: eventTypeSitemapRequested,
    });
};

export const activateSitemapDataUpdateEventListener = () => {
    addReliableEventListener<{ entries: SitemapEntry[] }>({
        type: eventTypeSitemapGenerated,
        callback: (event) => {
            updateSitemapData(event.data.entries);
        },
    });

    addReliableEventListener({
        type: eventTypeSitemapRequested,
        callback: () => {
            generateAndBroadcastSitemapData();
        },
    });

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        localOnly: false,
        callback: (event) => {
            event.data.nodes.forEach((node) => {
                if (node.branch === 'master' && node.repo === contentRootRepoId) {
                    const xpPath = node.path.replace(/^\/content/, '');
                    updateSitemapEntry(xpPath);
                }
            });
        },
    });
};
