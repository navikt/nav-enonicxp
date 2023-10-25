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
import { getLayersData } from '../localization/layers-data';
import { runInLocaleContext } from '../localization/locale-context';
import { isContentLocalized } from '../localization/locale-utils';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getPublicPath } from '../paths/public-path';
import { customListenerType } from '../utils/events';
import { forceArray, iterableToArray } from '../utils/array-utils';

const MAX_COUNT = 50000;
const EVENT_TYPE_SITEMAP_GENERATED = 'sitemap-generated';
const EVENT_TYPE_SITEMAP_REQUESTED = 'sitemap-requested';

type LanguageVersion = {
    language: string;
    url: string;
};

type SitemapEntry = {
    _contentId: string;
    _contentLocale: string;
    _legacyLanguages: string[];
    _key: string;
    url: string;
    modifiedTime: string;
    language: string;
    languageVersions?: LanguageVersion[];
};

let isGenerating = false;

let sitemapEntriesMap = new Map<string, SitemapEntry>();

const contentTypesInSitemapSet: ReadonlySet<string> = new Set(contentTypesInSitemap);

const shouldIncludeContent = (content: Content | null): content is Content =>
    !!(
        content &&
        contentTypesInSitemapSet.has(content.type) &&
        !content.data?.externalProductUrl &&
        !content.data?.noindex &&
        isContentLocalized(content)
    );

const getKey = (contentId: string, locale: string) => `${contentId}-${locale}`;

const getUrl = (content: Content, locale: string) => {
    if (content.data?.canonicalUrl) {
        return content.data.canonicalUrl;
    }

    const pathname = getPublicPath(content, locale);
    return `${URLS.FRONTEND_ORIGIN}${pathname}`;
};

const transformLanguageVersion = (languageEntry: SitemapEntry): LanguageVersion => {
    return {
        language: languageEntry.language,
        url: languageEntry.url,
    };
};

const resolveLanguageVersions = (sitemapEntry: SitemapEntry) => {
    const { _contentId, _contentLocale } = sitemapEntry;
    const { locales, defaultLocale } = getLayersData();

    const localesToResolve = locales.filter((locale) => locale != _contentLocale);

    const languageVersions = localesToResolve.reduce<SitemapEntry[]>((acc, locale) => {
        const version = sitemapEntriesMap.get(getKey(_contentId, locale));
        if (version) {
            acc.push(version);
        }

        return acc;
    }, []);

    const legacyLanguages = sitemapEntriesMap.get(getKey(_contentId, defaultLocale))
        ?._legacyLanguages;
    if (legacyLanguages) {
        legacyLanguages.forEach((languageRefContentId) => {
            if (languageRefContentId === _contentId) {
                return;
            }

            const version = sitemapEntriesMap.get(getKey(languageRefContentId, defaultLocale));
            if (!version) {
                return;
            }

            if (languageVersions.some((_version) => _version.language === version.language)) {
                return;
            }

            languageVersions.push(version);
        }, []);
    }

    return languageVersions.map(transformLanguageVersion);
};

const buildSitemapEntry = (
    content: Content,
    locale: string,
    resolveLanguages: boolean
): SitemapEntry => {
    const sitemapEntry: SitemapEntry = {
        _key: getKey(content._id, locale),
        _contentId: content._id,
        _contentLocale: locale,
        _legacyLanguages: forceArray(content.data.languages),
        url: getUrl(content, locale),
        modifiedTime: content.modifiedTime,
        language: content.language,
    };

    if (resolveLanguages) {
        sitemapEntry.languageVersions = resolveLanguageVersions(sitemapEntry);
    }

    return sitemapEntry;
};

const updateSitemapEntry = (contentId: string, locale: string) =>
    runInLocaleContext({ branch: 'master', locale }, () => {
        const content = contentLib.get({ key: contentId });
        const key = getKey(contentId, locale);

        if (shouldIncludeContent(content)) {
            sitemapEntriesMap.set(key, buildSitemapEntry(content, locale, true));
        } else if (sitemapEntriesMap.get(contentId)) {
            sitemapEntriesMap.delete(key);
        }
    });

export let sitemapQueryResponse: SitemapEntry[] = [];

const generateSitemapEntries = (): SitemapEntry[] => {
    const repoIdContentBuckets = queryAllLayersToRepoIdBuckets({
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

    const sitemapEntries: SitemapEntry[] = [];

    Object.entries(repoIdContentBuckets).forEach(([repoId, contents]) => {
        const locale = getLayersData().repoIdToLocaleMap[repoId];

        contents.forEach((content) => {
            const entry = buildSitemapEntry(content, locale, false);
            sitemapEntries.push(entry);
        });
    });

    sitemapQueryResponse = sitemapEntries;

    updateSitemapData(sitemapEntries);

    // Iterate over all entries again after to resolve language versions
    // We need the initial iteration done first to ensure language references
    // can be resolved from the sitemapData map
    sitemapEntries.forEach((sitemapEntry) => {
        sitemapEntry.languageVersions = resolveLanguageVersions(sitemapEntry);
    });

    return sitemapEntries;
};

export const getAllSitemapEntries = () => {
    const array = iterableToArray(sitemapEntriesMap.values());

    if (array.length !== sitemapEntriesMap.size) {
        logger.error(
            `Sitemap entries array has unexpected length - expected ${sitemapEntriesMap.size} - got ${array.length}`
        );
    }

    return array;
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

    const sitemapEntriesMapNew = new Map<string, SitemapEntry>();

    entries.forEach((entry) => {
        if (sitemapEntriesMapNew.has(entry._key)) {
            logger.info(`Duplicate entry for sitemap data: ${JSON.stringify(entry)}`);
        } else {
            sitemapEntriesMapNew.set(entry._key, entry);
        }
    });

    sitemapEntriesMap = sitemapEntriesMapNew;

    logger.info(`Updated sitemap data with ${sitemapEntriesMap.size} / ${entries.length} entries`);
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
