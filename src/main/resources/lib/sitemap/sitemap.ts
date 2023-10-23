import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as taskLib from '/lib/xp/task';
import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { runInContext } from '../context/run-in-context';
import { URLS } from '../constants';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { contentTypesInSitemap } from '../contenttype-lists';
import { logger } from '../utils/logging';
import {
    getLanguageVersions,
    LanguageSelectorData,
} from '../localization/resolve-language-versions';
import { getLayersData } from '../localization/layers-data';
import { runInLocaleContext } from '../localization/locale-context';
import { isContentLocalized } from '../localization/locale-utils';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getPublicPath } from '../paths/public-path';
import { customListenerType } from '../utils/events';

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

const contentTypesInSitemapSet: ReadonlySet<string> = new Set(contentTypesInSitemap);

const shouldIncludeContent = (content: Content<any> | null): content is Content =>
    !!(
        content &&
        contentTypesInSitemapSet.has(content.type) &&
        !content.data?.externalProductUrl &&
        !content.data?.noindex &&
        isContentLocalized(content)
    );

const getUrl = (content: Content<any>, locale: string) => {
    if (content.data?.canonicalUrl) {
        return content.data.canonicalUrl;
    }

    const pathname = getPublicPath(content, locale);
    return `${URLS.FRONTEND_ORIGIN}${pathname}`;
};

const transformLanguageVersion = (languageSelectorData: LanguageSelectorData): LanguageVersion => ({
    language: languageSelectorData.language,
    url: `${URLS.FRONTEND_ORIGIN}${languageSelectorData._path}`,
});

const getSitemapEntry = (content: Content, locale: string): SitemapEntry => {
    const languageVersions = getLanguageVersions({
        baseContent: content,
        branch: 'master',
        baseContentLocale: locale,
    }).map(transformLanguageVersion);

    return {
        id: `${content._id}-${locale}`,
        url: getUrl(content, locale),
        modifiedTime: content.modifiedTime,
        language: content.language,
        ...(languageVersions && languageVersions.length > 0 && { languageVersions }),
    };
};

const updateSitemapEntry = (contentId: string, locale: string) =>
    runInLocaleContext({ branch: 'master', locale }, () => {
        const content = contentLib.get({ key: contentId });

        if (shouldIncludeContent(content)) {
            sitemapData.set(contentId, getSitemapEntry(content, locale));
        } else if (sitemapData.get(contentId)) {
            sitemapData.remove(contentId);
        }
    });

const generateSitemapEntries = (): SitemapEntry[] => {
    logger.info(`Starting!`);
    const start = Date.now();

    const localeContentBuckets = queryAllLayersToRepoIdBuckets({
        branch: 'master',
        state: 'localized',
        resolveContent: true,
        queryParams: {
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
                    must: {
                        hasValue: {
                            field: 'type',
                            values: contentTypesInSitemap,
                        },
                    },
                },
            },
        },
    });

    logger.info(`Finished query after ${Date.now() - start}`);

    return Object.entries(localeContentBuckets)
        .map(([locale, contents]) => contents.map((content) => getSitemapEntry(content, locale)))
        .flat();
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
                    const sitemapEntries = generateSitemapEntries();

                    eventLib.send({
                        type: EVENT_TYPE_SITEMAP_GENERATED,
                        distributed: true,
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
    eventLib.send({
        distributed: true,
        type: EVENT_TYPE_SITEMAP_REQUESTED,
    });
};

export const activateSitemapDataUpdateEventListener = () => {
    eventLib.listener<{ entries: SitemapEntry[] }>({
        type: customListenerType(EVENT_TYPE_SITEMAP_GENERATED),
        localOnly: false,
        callback: (event) => {
            updateSitemapData(event.data.entries);
        },
    });

    eventLib.listener({
        type: customListenerType(EVENT_TYPE_SITEMAP_REQUESTED),
        localOnly: false,
        callback: generateAndBroadcastSitemapData,
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

                updateSitemapEntry(node.id, locale);
            });
        },
    });
};
