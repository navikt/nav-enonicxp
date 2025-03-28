import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as taskLib from '/lib/xp/task';
import * as eventLib from '/lib/xp/event';
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
import { clusterInfo } from '../cluster-utils/cluster-api';
import { isMainDatanode } from '../cluster-utils/main-datanode';
import { getParentPath } from '../paths/path-utils';
import { runInContext } from '../context/run-in-context';

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

const shouldIncludeContent = (
    content: Content<any> | null,
    repoId?: string
): content is Content => {
    if (!content) {
        return false;
    }

    let isParentLess = false;

    // some man-article content has been converted to redirects (to new content types, ie. "guide-page" etc).
    // while some chapters (child node content) have also been converted to redirects, some are still left behind, resulting i 404.
    // Make sure these aren't included.
    if (content.type === 'no.nav.navno:main-article-chapter') {
        const parentPath = getParentPath(content._path);

        runInContext({ repository: repoId, branch: 'master' }, () => {
            const parentContent = contentLib.get({ key: parentPath });
            if (parentContent && parentContent.type !== 'no.nav.navno:main-article') {
                log.info(
                    `This chapter has no viewable main-article parent. Skipping main-article-chapter ${content._id}`
                );
                isParentLess = true;
            }
        });
    }

    return !!(
        contentTypesInSitemapSet.has(content.type) &&
        !content.data?.externalProductUrl &&
        !content.data?.noindex &&
        !isParentLess &&
        isContentLocalized(content)
    );
};

const getKey = (contentId: string, locale: string) => `${contentId}-${locale}`;

const getUrl = (content: Content<any>, locale: string) => {
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

    const legacyLanguages = sitemapEntriesMap.get(
        getKey(_contentId, defaultLocale)
    )?._legacyLanguages;
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
    content: Content<any>,
    locale: string,
    resolveLanguages: boolean
): SitemapEntry => {
    const sitemapEntry: SitemapEntry = {
        _key: getKey(content._id, locale),
        _contentId: content._id,
        _contentLocale: locale,
        _legacyLanguages: forceArray(content.data.languages),
        url: getUrl(content, locale),
        modifiedTime: content.modifiedTime || content.createdTime,
        language: content.language || getLayersData().defaultLocale,
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
            if (!shouldIncludeContent(content)) {
                return;
            }

            const entry = buildSitemapEntry(content, locale, false);
            sitemapEntries.push(entry);
        });
    });

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
    if (!isMainDatanode() || isGenerating) {
        logger.info(`Skipping sitemap generation on ${clusterInfo.localServerName}`);
        return;
    }

    isGenerating = true;

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
                    `Finished generating sitemap data with ${sitemapEntries.length} entries after ${
                        Date.now() - startTime
                    }ms`
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
            logger.warning(`Duplicate entry for sitemap data: ${JSON.stringify(entry)}`);
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
