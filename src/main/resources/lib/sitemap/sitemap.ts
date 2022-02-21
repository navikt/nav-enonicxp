import contentLib, { Content } from '/lib/xp/content';
import taskLib from '/lib/xp/task';
import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import { getContentFromCustomPath, isValidCustomPath } from '../custom-paths/custom-paths';
import { forceArray } from '../utils/nav-utils';
import { runInBranchContext } from '../utils/branch-context';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { urls } from '../constants';
import { createOrUpdateSchedule } from '../utils/scheduler';

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

export const sitemapContentTypes: ContentDescriptor[] = [
    `${app.name}:situation-page`,
    `${app.name}:guide-page`,
    `${app.name}:themed-article-page`,
    `${app.name}:employer-situation-page`,
    `${app.name}:dynamic-page`,
    `${app.name}:content-page-with-sidemenus`,
    `${app.name}:main-article`,
    `${app.name}:section-page`,
    `${app.name}:page-list`,
    `${app.name}:transport-page`,
    `${app.name}:office-information`,
    `${app.name}:publishing-calendar`,
    `${app.name}:large-table`,
];

const isIncludedType = (type: string) =>
    !!sitemapContentTypes.find((includedType) => includedType === type);

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

    const pathname = isValidCustomPath(customPath)
        ? customPath
        : content._path.replace(/^\/www.nav.no/, '');
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
            log.error(`Could not retrieve alt language content for sitemap - root id: ${content._id} - alt id: ${id} - Error: ${e}`);
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
        log.warning(`Multiple entries found for custom path ${path} - skipping sitemap entry`);
        return null;
    }

    return runInBranchContext(() => contentLib.get({ key: path }), 'master');
};

const updateSitemapEntry = (path: string) => {
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
};

const getSitemapEntries = (start = 0, previousEntries: SitemapEntry[] = []): SitemapEntry[] => {
    const entriesBatch = contentLib
        .query({
            start,
            count: batchCount,
            contentTypes: sitemapContentTypes,
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
    if (clusterLib.isMaster() && !isGenerating) {
        isGenerating = true;

        taskLib.executeFunction({
            description: 'sitemap-generator-task',
            func: () => {
                try {
                    log.info('Started generating sitemap data');
                    const startTime = Date.now();
                    const sitemapEntries = getSitemapEntries();

                    eventLib.send({
                        type: eventTypeSitemapGenerated,
                        distributed: true,
                        data: { entries: sitemapEntries },
                    });

                    log.info(
                        `Finished generating sitemap data with ${
                            sitemapEntries.length
                        } entries after ${Date.now() - startTime}ms`
                    );

                    if (sitemapEntries.length > maxCount) {
                        log.warning(`Sitemap entries count exceeds recommended maximum`);
                    }
                } catch (e) {
                    log.error(`Error while generating sitemap - ${e}`);
                } finally {
                    isGenerating = false;
                }
            },
        });
    }
};

export const generateSitemapDataAndActivateSchedule = () => {
    runInBranchContext(generateAndBroadcastSitemapData, 'master');

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
        log.error('Attempted to update sitemap with invalid data');
        return;
    }

    sitemapData.clear();

    entries.forEach((entry) => {
        sitemapData.set(entry.id, entry);
    });
};

export const requestSitemapUpdate = () => {
    eventLib.send({
        type: eventTypeSitemapRequested,
        distributed: true,
        data: {},
    });
};

export const activateSitemapDataUpdateEventListener = () => {
    eventLib.listener<{ entries: SitemapEntry[] }>({
        type: `custom.${eventTypeSitemapGenerated}`,
        callback: (event) => {
            log.info('Received sitemap data from master, updating...');
            updateSitemapData(event.data.entries);
        },
    });

    eventLib.listener({
        type: `custom.${eventTypeSitemapRequested}`,
        callback: () => {
            log.info('Received request for sitemap regeneration');
            generateAndBroadcastSitemapData();
        },
    });

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        localOnly: false,
        callback: (event) => {
            event.data.nodes.forEach((node) => {
                if (node.branch === 'master' && node.repo === 'com.enonic.cms.default') {
                    const xpPath = node.path.replace(/^\/content/, '');
                    updateSitemapEntry(xpPath);
                }
            });
        },
    });
};
