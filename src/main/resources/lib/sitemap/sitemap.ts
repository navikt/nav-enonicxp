import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as taskLib from '/lib/xp/task';
import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { getContentFromCustomPath, isValidCustomPath } from '../custom-paths/custom-paths';
import { stringArrayToSet, stripPathPrefix } from '../utils/nav-utils';
import { runInContext } from '../context/run-in-context';
import { URLS } from '../constants';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { addReliableEventListener, sendReliableEvent } from '../events/reliable-custom-events';
import { contentTypesInSitemap } from '../contenttype-lists';
import { logger } from '../utils/logging';
import { getLanguageVersionsFull } from '../localization/resolve-language-versions';
import { getLayersData } from '../localization/layers-data';
import { runInLocaleContext } from '../localization/locale-context';
import { isContentLocalized } from '../localization/locale-utils';

const BATCH_COUNT = 1000;
const MAX_COUNT = 50000;
const EVENT_TYPE_SITEMAP_GENERATED = 'sitemap-generated';
const EVENT_TYPE_SITEMAP_REQUESTED = 'sitemap-requested';

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

const contentTypesInSitemapSet = stringArrayToSet(contentTypesInSitemap);

const shouldIncludeContent = (content: Content<any>) =>
    content &&
    contentTypesInSitemapSet[content.type] &&
    !content.data?.externalProductUrl &&
    !content.data?.noindex &&
    isContentLocalized(content);

const getUrl = (content: Content<any>) => {
    if (content.data?.canonicalUrl) {
        return content.data.canonicalUrl;
    }

    const customPath = content.data?.customPath;

    const pathname = isValidCustomPath(customPath) ? customPath : stripPathPrefix(content._path);
    return `${URLS.FRONTEND_ORIGIN}${pathname}`;
};

const getAlternativeLanguageVersions = (content: Content): LanguageVersion => ({
    language: content.language,
    url: getUrl(content),
});

const getSitemapEntry = (content: Content): SitemapEntry => {
    const languageVersions = getLanguageVersionsFull(content, 'master').map(
        getAlternativeLanguageVersions
    );

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
        logger.critical(`Multiple entries found for custom path ${path} - skipping sitemap entry`);
        return null;
    }

    if (contentFromCustomPath.length === 1) {
        return contentFromCustomPath[0];
    }

    return runInContext({ branch: 'master' }, () => contentLib.get({ key: path }));
};

const updateSitemapEntry = (path: string, locale: string) =>
    runInLocaleContext({ branch: 'master', locale }, () => {
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
            count: BATCH_COUNT,
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

    if (entriesBatch.length < BATCH_COUNT) {
        return currentEntries;
    }

    return getSitemapEntries(start + BATCH_COUNT, currentEntries);
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
                        type: EVENT_TYPE_SITEMAP_GENERATED,
                        data: { entries: sitemapEntries },
                    });

                    logger.info(
                        `Finished generating sitemap data with ${
                            sitemapEntries.length
                        } entries after ${Date.now() - startTime}ms`
                    );

                    if (sitemapEntries.length > MAX_COUNT) {
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
        type: EVENT_TYPE_SITEMAP_REQUESTED,
    });
};

export const activateSitemapDataUpdateEventListener = () => {
    addReliableEventListener<{ entries: SitemapEntry[] }>({
        type: EVENT_TYPE_SITEMAP_GENERATED,
        callback: (event) => {
            updateSitemapData(event.data.entries);
        },
    });

    addReliableEventListener({
        type: EVENT_TYPE_SITEMAP_REQUESTED,
        callback: () => {
            generateAndBroadcastSitemapData();
        },
    });

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        localOnly: false,
        callback: (event) => {
            event.data.nodes.forEach((node) => {
                if (node.branch !== 'master') {
                    return;
                }

                const locale = getLayersData().repoIdToLocaleMap[node.repo];
                if (!locale) {
                    return;
                }

                const xpPath = node.path.replace(/^\/content/, '');
                updateSitemapEntry(xpPath, locale);
            });
        },
    });
};
