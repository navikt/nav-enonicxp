import { Request } from '@enonic-types/core';
import * as taskLib from '/lib/xp/task';
import { Content } from '/lib/xp/content';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { contentTypesInSitemap, contentTypesWithDeepReferences } from '../../lib/contenttype-lists';
import { getLayersData } from '../../lib/localization/layers-data';
import { NON_LOCALIZED_QUERY_FILTER } from '../../lib/localization/layers-repo-utils/localization-state-filters';
import { batchedNodeQuery } from '../../lib/utils/batched-query';
import { getRepoConnection } from '../../lib/repos/repo-utils';
import { ReferencesFinder } from '../../lib/reference-search/references-finder';
import { getPublishedAndModifiedVersions } from '../../lib/time-travel/get-published-versions';
import { getUnixTimeFromDateTimeString } from '../../lib/utils/datetime-utils';
import { runInContext } from '../../lib/context/run-in-context';
import { logger } from '../../lib/utils/logging';
import { NAVNO_NODE_ROOT_PATH } from '../../lib/constants';

// TEMPORARY - remove when the measurement is done.
//
// Estimates how many extra snapshots navno-cms-archive would need if pages were archived again
// every time content they depend on (fragments, global values etc.) is published. Uses the same
// deep reference search and timeout as cache invalidation. Read-only.
//
// POST ?limit=<n>&type=<content type>  starts the measurement on the node receiving the request
// GET ?taskId=<id>                      progress, and the result when finished
//
// The result is also logged with the prefix below.

const LOG_PREFIX = '[archive-dependency-stats]';
const SEARCH_TIMEOUT_MS = 10000; // Same as cache invalidation
const RETRY_TIMEOUT_MS = 60000;
const THROTTLE_MS = 200;
const TOP_COUNT = 25;
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

const dependencyTypes: readonly string[] = contentTypesWithDeepReferences;
const pageTypes: ReadonlySet<string> = new Set<string>(contentTypesInSitemap);

type MeasurementParams = { limit?: number; type?: string };

type Stats = {
    contents: number;
    unused: number;
    versions: number;
    versionsLast12m: number;
    pages: number;
    snapshotsAllTime: number;
    snapshotsLast12m: number;
    searchFailedWithin10s: number;
    searchFailedWithin60s: number;
};

type ContentResult = {
    contentId: string;
    locale: string;
    type: string;
    path: string;
    versions: number;
    versionsLast12m: number;
    pages: number;
    snapshotsAllTime: number;
};

type Summary = {
    params: MeasurementParams;
    startedAt: string;
    finishedAt?: string;
    durationMinutes?: number;
    processed: number;
    total: number;
    errors: number;
    searchMsTotal: number;
    searchMsMax: number;
    totals: Stats;
    byType: Record<string, Stats>;
    snapshotsByYear: Record<string, number>;
    top: ContentResult[];
};

let currentTaskId: string | null = null;

const createStats = (): Stats => ({
    contents: 0,
    unused: 0,
    versions: 0,
    versionsLast12m: 0,
    pages: 0,
    snapshotsAllTime: 0,
    snapshotsLast12m: 0,
    searchFailedWithin10s: 0,
    searchFailedWithin60s: 0,
});

// Inherited content is counted in the layer it is inherited from
const findDependencyContents = (type?: string) => {
    const { locales, localeToRepoIdMap } = getLayersData();

    return locales.reduce<{ contentId: string; locale: string }[]>((acc, locale) => {
        const { hits } = batchedNodeQuery({
            repo: getRepoConnection({
                repoId: localeToRepoIdMap[locale],
                branch: 'master',
                asAdmin: true,
            }),
            queryParams: {
                query: `_path LIKE "${NAVNO_NODE_ROOT_PATH}/*"`,
                filters: {
                    boolean: {
                        must: {
                            hasValue: {
                                field: 'type',
                                values: type ? [type] : [...dependencyTypes],
                            },
                        },
                        mustNot: NON_LOCALIZED_QUERY_FILTER,
                    },
                },
            },
        });

        return acc.concat(hits.map((hit) => ({ contentId: hit.id, locale })));
    }, []);
};

// Same approach as findReferencedPaths in lib/cache/find-paths-to-invalidate.ts: content in the
// default layer can be used in every layer
const countReferencingPages = (contentId: string, sourceLocale: string, timeout: number) => {
    const { locales, localeToRepoIdMap, defaultLocale } = getLayersData();
    const localesToSearch = sourceLocale === defaultLocale ? locales : [sourceLocale];

    let pages = 0;

    for (const locale of localesToSearch) {
        const references = new ReferencesFinder({
            contentId,
            repoId: localeToRepoIdMap[locale],
            branch: 'master',
            withDeepSearch: true,
            timeout,
            logErrorsOnly: true,
        }).run();

        if (!references) {
            return null;
        }

        pages += references.filter((content) => pageTypes.has(content.type)).length;
    }

    return pages;
};

const measureContent = (contentId: string, locale: string, cutoffTime: number) => {
    const content = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'master',
        asAdmin: true,
    }).get<Content>(contentId);

    if (!content) {
        return null;
    }

    const versions = getPublishedAndModifiedVersions(contentId, locale);
    const versionsLast12m = versions.filter(
        (version) => getUnixTimeFromDateTimeString(version.timestamp) >= cutoffTime
    ).length;

    const searchStart = Date.now();
    const pagesWithin10s = countReferencingPages(contentId, locale, SEARCH_TIMEOUT_MS);
    const pagesWithin60s =
        pagesWithin10s ?? countReferencingPages(contentId, locale, RETRY_TIMEOUT_MS);
    const pages = pagesWithin60s ?? 0;

    const result: ContentResult = {
        contentId,
        locale,
        type: content.type,
        path: content._path,
        versions: versions.length,
        versionsLast12m,
        pages,
        snapshotsAllTime: versions.length * pages,
    };

    return {
        result,
        versionYears: versions.map((version) => version.timestamp.slice(0, 4)),
        searchFailedWithin10s: pagesWithin10s === null,
        searchFailedWithin60s: pagesWithin60s === null,
        searchMs: Date.now() - searchStart,
    };
};

type Measurement = NonNullable<ReturnType<typeof measureContent>>;

const addToStats = (stats: Stats, measurement: Measurement) => {
    const { result, searchFailedWithin10s, searchFailedWithin60s } = measurement;

    stats.contents += 1;
    stats.versions += result.versions;
    stats.versionsLast12m += result.versionsLast12m;
    stats.pages += result.pages;
    stats.snapshotsAllTime += result.snapshotsAllTime;
    stats.snapshotsLast12m += result.versionsLast12m * result.pages;

    if (result.pages === 0 && !searchFailedWithin60s) {
        stats.unused += 1;
    }
    if (searchFailedWithin10s) {
        stats.searchFailedWithin10s += 1;
    }
    if (searchFailedWithin60s) {
        stats.searchFailedWithin60s += 1;
    }
};

const runMeasurement = (params: MeasurementParams) => {
    const startTime = Date.now();
    const cutoffTime = startTime - ONE_YEAR_MS;

    const allContents = findDependencyContents(params.type);
    const contents = params.limit ? allContents.slice(0, params.limit) : allContents;

    const summary: Summary = {
        params,
        startedAt: new Date(startTime).toISOString(),
        processed: 0,
        total: contents.length,
        errors: 0,
        searchMsTotal: 0,
        searchMsMax: 0,
        totals: createStats(),
        byType: {},
        snapshotsByYear: {},
        top: [],
    };
    const results: ContentResult[] = [];

    logger.info(`${LOG_PREFIX} Started - measuring ${contents.length} of ${allContents.length}`);

    contents.forEach(({ contentId, locale }, index) => {
        try {
            const measurement = measureContent(contentId, locale, cutoffTime);
            if (measurement) {
                const { result } = measurement;

                if (!summary.byType[result.type]) {
                    summary.byType[result.type] = createStats();
                }

                addToStats(summary.totals, measurement);
                addToStats(summary.byType[result.type], measurement);

                measurement.versionYears.forEach((year) => {
                    summary.snapshotsByYear[year] =
                        (summary.snapshotsByYear[year] || 0) + result.pages;
                });

                summary.searchMsTotal += measurement.searchMs;
                summary.searchMsMax = Math.max(summary.searchMsMax, measurement.searchMs);

                results.push(result);
            }
        } catch (e) {
            summary.errors += 1;
            logger.error(`${LOG_PREFIX} Failed for ${contentId} [${locale}] - ${e}`);
        }

        summary.processed = index + 1;
        taskLib.progress({
            current: summary.processed,
            total: contents.length,
            info: `${summary.processed}/${contents.length}`,
        });

        if (summary.processed % 100 === 0) {
            logger.info(`${LOG_PREFIX} Progress ${summary.processed}/${contents.length}`);
        }

        taskLib.sleep(THROTTLE_MS);
    });

    summary.top = results
        .sort((a, b) => b.snapshotsAllTime - a.snapshotsAllTime)
        .slice(0, TOP_COUNT);
    summary.finishedAt = new Date().toISOString();
    summary.durationMinutes = Math.round((Date.now() - startTime) / 60000);

    const summaryJson = JSON.stringify(summary);

    taskLib.progress({ current: contents.length, total: contents.length, info: summaryJson });
    logger.info(`${LOG_PREFIX} Finished - ${summaryJson}`);
};

const jsonResponse = (status: number, body: Record<string, unknown>) => ({
    status,
    contentType: 'application/json',
    body,
});

const parseSummary = (info?: string) => {
    try {
        return info ? JSON.parse(info) : null;
    } catch {
        return null;
    }
};

export const post = (req: Request) => {
    if (!validateServiceSecretHeader(req)) {
        return { status: 401 };
    }

    if (currentTaskId && taskLib.isRunning(currentTaskId)) {
        return jsonResponse(409, {
            message: 'Measurement is already running on this node',
            taskId: currentTaskId,
        });
    }

    const limitParam = req.params.limit as string | undefined;
    if (limitParam && !/^[1-9]\d*$/.test(limitParam)) {
        return jsonResponse(400, { message: 'Parameter "limit" must be a positive integer' });
    }

    const type = req.params.type as string | undefined;
    if (type && dependencyTypes.indexOf(type) === -1) {
        return jsonResponse(400, {
            message: `Parameter "type" must be one of: ${dependencyTypes.join(', ')}`,
        });
    }

    const params: MeasurementParams = {
        limit: limitParam ? Number(limitParam) : undefined,
        type,
    };

    currentTaskId = taskLib.executeFunction({
        description: 'archive-dependency-stats',
        func: () => runInContext({ asAdmin: true }, () => runMeasurement(params)),
    });

    return jsonResponse(202, { taskId: currentTaskId });
};

export const get = (req: Request) => {
    if (!validateServiceSecretHeader(req)) {
        return { status: 401 };
    }

    const taskId = req.params.taskId as string | undefined;
    if (!taskId) {
        return jsonResponse(400, { message: 'Parameter "taskId" is required' });
    }

    const task = taskLib.get(taskId);
    if (!task) {
        return jsonResponse(404, { message: `Task ${taskId} not found` });
    }

    const { state, node, progress } = task;

    return jsonResponse(200, {
        state,
        node,
        current: progress?.current,
        total: progress?.total,
        result: state === 'FINISHED' ? parseSummary(progress?.info) : null,
    });
};
