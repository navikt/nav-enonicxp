import { Request } from '@enonic-types/core';
import * as taskLib from '/lib/xp/task';
import * as gridLib from '/lib/xp/grid';
import { Content } from '/lib/xp/content';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { contentTypesInSitemap } from '../../lib/contenttype-lists';
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
// every time something they show is published (fragments, global values, images, other pages
// etc.). Uses the same deep reference search and timeout as cache invalidation. Read-only.
//
// Each content type is measured from a random sample, scaled up to all content of the type. The
// oldest published version is not counted: when content is first added to a page, the page gets
// a new version of its own, which the regular archive backfill covers.
//
// POST ?sample=<n|all>&type=<content type>  starts the measurement on the node receiving the
//                                            request. sample is per content type (default 100).
//                                            all measures all content, without sampling
// GET ?taskId=<id>                           progress, and the result when finished
//
// XP removes finished tasks after 60 seconds, so the result is also kept in a shared map for a
// week, and logged with the prefix below. Each content type is logged as it finishes.

const LOG_PREFIX = '[archive-dependency-stats]';
const SEARCH_TIMEOUT_MS = 10000; // Same as cache invalidation
const RETRY_TIMEOUT_MS = 60000;
const THROTTLE_MS = 200;
const DEFAULT_SAMPLE_SIZE = 100;
const TOP_COUNT = 25;
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const RESULT_MAP_ID = 'archive-dependency-stats';
const RESULT_TTL_SECONDS = 60 * 60 * 24 * 7;

const CONTENT_QUERY = `_path LIKE "${NAVNO_NODE_ROOT_PATH}/*"`;

// Folders and the site never change a rendered page. Templates are left out because time travel
// also resolves them to their current version
const excludedTypes = [
    'base:folder',
    'portal:template-folder',
    'portal:page-template',
    'portal:site',
];

const pageTypes: ReadonlySet<string> = new Set<string>(contentTypesInSitemap);

type MeasurementParams = { sample: number | 'all'; type?: string };

type ContentRef = { contentId: string; locale: string };

type PlannedType = { type: string; total: number; sample: ContentRef[] };

type TypeStats = {
    total: number;
    measured: number;
    notFound: number;
    singleVersion: number;
    unused: number;
    extraVersions: number;
    extraVersionsLast12m: number;
    pageRefs: number;
    snapshots: number;
    snapshotsLast12m: number;
    estimatedSnapshots: number;
    estimatedSnapshotsLast12m: number;
    searchFailedWithin10s: number;
    searchFailedWithin60s: number;
    referencingPageTypes: Record<string, number>;
};

type ContentResult = {
    contentId: string;
    locale: string;
    type: string;
    path: string;
    versions: number;
    pages: number;
    snapshots: number;
    referencingPageTypes: Record<string, number>;
};

type Measurement = {
    result: ContentResult;
    extraVersionsLast12m: number;
    extraVersionYears: string[];
    searched: boolean;
    searchFailedWithin10s: boolean;
    searchFailedWithin60s: boolean;
    searchMs: number;
};

type Summary = {
    params: MeasurementParams;
    startedAt: string;
    finishedAt?: string;
    durationMinutes?: number;
    processed: number;
    plannedTotal: number;
    errors: number;
    searchMsTotal: number;
    searchMsMax: number;
    totals: {
        contents: number;
        measured: number;
        estimatedSnapshots: number;
        estimatedSnapshotsLast12m: number;
        searchFailedWithin10s: number;
        searchFailedWithin60s: number;
    };
    estimatedSnapshotsByYear: Record<string, number>;
    byType: Record<string, TypeStats>;
    top: ContentResult[];
};

type ResultMap = Record<string, string>;

// Lets the task read its own id, which is only known when executeFunction returns
type Run = { taskId: string };

let currentTaskId: string | null = null;

const createTypeStats = (total: number): TypeStats => ({
    total,
    measured: 0,
    notFound: 0,
    singleVersion: 0,
    unused: 0,
    extraVersions: 0,
    extraVersionsLast12m: 0,
    pageRefs: 0,
    snapshots: 0,
    snapshotsLast12m: 0,
    estimatedSnapshots: 0,
    estimatedSnapshotsLast12m: 0,
    searchFailedWithin10s: 0,
    searchFailedWithin60s: 0,
    referencingPageTypes: {},
});

const addCounts = (target: Record<string, number>, counts: Record<string, number>) => {
    Object.keys(counts).forEach((key) => {
        target[key] = (target[key] || 0) + counts[key];
    });
};

const sumCounts = (counts: Record<string, number>) =>
    Object.keys(counts).reduce((acc, key) => acc + counts[key], 0);

const getRepo = (locale: string) =>
    getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'master',
        asAdmin: true,
    });

// Inherited content is counted in the layer it is inherited from
const getContentFilters = (type?: string) => ({
    boolean: {
        ...(type ? { must: { hasValue: { field: 'type', values: [type] } } } : {}),
        mustNot: [
            ...NON_LOCALIZED_QUERY_FILTER,
            { hasValue: { field: 'type', values: excludedTypes } },
        ],
    },
});

const findContentTypes = (locale: string, type?: string) =>
    getRepo(locale)
        .query({
            start: 0,
            count: 0,
            query: CONTENT_QUERY,
            filters: getContentFilters(type),
            aggregations: { types: { terms: { field: 'type', size: 1000 } } },
        })
        .aggregations.types.buckets.map((bucket) => bucket.key);

const findContentIds = (locale: string, type: string) =>
    batchedNodeQuery({
        repo: getRepo(locale),
        queryParams: { query: CONTENT_QUERY, filters: getContentFilters(type) },
    }).hits.map((hit) => hit.id);

// Partial Fisher-Yates shuffle
const getRandomSample = <Item>(items: Item[], size: number) => {
    const shuffled = items.slice();
    const sampleSize = Math.min(size, shuffled.length);

    for (let i = 0; i < sampleSize; i++) {
        const j = i + Math.floor(Math.random() * (shuffled.length - i));
        const item = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = item;
    }

    return shuffled.slice(0, sampleSize);
};

const planMeasurement = ({ sample, type }: MeasurementParams): PlannedType[] => {
    const refsByType: Record<string, ContentRef[]> = {};

    getLayersData().locales.forEach((locale) => {
        findContentTypes(locale, type).forEach((contentType) => {
            if (!refsByType[contentType]) {
                refsByType[contentType] = [];
            }

            findContentIds(locale, contentType).forEach((contentId) => {
                refsByType[contentType].push({ contentId, locale });
            });
        });
    });

    return Object.keys(refsByType)
        .sort()
        .map((contentType) => {
            const refs = refsByType[contentType];

            return {
                type: contentType,
                total: refs.length,
                sample: sample === 'all' ? refs : getRandomSample(refs, sample),
            };
        });
};

// Same approach as findReferencedPaths in lib/cache/find-paths-to-invalidate.ts: content in the
// default layer can be used in every layer
const findReferencingPages = (contentId: string, sourceLocale: string, timeout: number) => {
    const { locales, localeToRepoIdMap, defaultLocale } = getLayersData();
    const localesToSearch = sourceLocale === defaultLocale ? locales : [sourceLocale];

    const pagesByType: Record<string, number> = {};

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

        references.forEach((content) => {
            if (pageTypes.has(content.type)) {
                pagesByType[content.type] = (pagesByType[content.type] || 0) + 1;
            }
        });
    }

    return pagesByType;
};

const measureContent = (
    { contentId, locale }: ContentRef,
    cutoffTime: number
): Measurement | null => {
    const content = getRepo(locale).get<Content>(contentId);
    if (!content) {
        return null;
    }

    // Newest first. The oldest version is not counted, see the top of this file
    const versions = getPublishedAndModifiedVersions(contentId, locale);
    const extraVersions = versions.slice(0, -1);

    const result: ContentResult = {
        contentId,
        locale,
        type: content.type,
        path: content._path,
        versions: versions.length,
        pages: 0,
        snapshots: 0,
        referencingPageTypes: {},
    };

    const measurement: Measurement = {
        result,
        extraVersionsLast12m: extraVersions.filter(
            (version) => getUnixTimeFromDateTimeString(version.timestamp) >= cutoffTime
        ).length,
        extraVersionYears: extraVersions.map((version) => version.timestamp.slice(0, 4)),
        searched: false,
        searchFailedWithin10s: false,
        searchFailedWithin60s: false,
        searchMs: 0,
    };

    // Content published only once has never changed a page, so the search can be skipped
    if (extraVersions.length === 0) {
        return measurement;
    }

    const searchStart = Date.now();
    const pagesWithin10s = findReferencingPages(contentId, locale, SEARCH_TIMEOUT_MS);
    const pagesWithin60s =
        pagesWithin10s ?? findReferencingPages(contentId, locale, RETRY_TIMEOUT_MS);

    measurement.searched = true;
    measurement.searchMs = Date.now() - searchStart;
    measurement.searchFailedWithin10s = pagesWithin10s === null;
    measurement.searchFailedWithin60s = pagesWithin60s === null;

    if (pagesWithin60s) {
        result.referencingPageTypes = pagesWithin60s;
        result.pages = sumCounts(pagesWithin60s);
        result.snapshots = extraVersions.length * result.pages;
    }

    return measurement;
};

const addToTypeStats = (
    stats: TypeStats,
    snapshotsByYear: Record<string, number>,
    measurement: Measurement
) => {
    const { result, extraVersionsLast12m, extraVersionYears } = measurement;

    stats.measured += 1;
    stats.extraVersions += extraVersionYears.length;
    stats.extraVersionsLast12m += extraVersionsLast12m;
    stats.pageRefs += result.pages;
    stats.snapshots += result.snapshots;
    stats.snapshotsLast12m += extraVersionsLast12m * result.pages;
    addCounts(stats.referencingPageTypes, result.referencingPageTypes);

    extraVersionYears.forEach((year) => {
        snapshotsByYear[year] = (snapshotsByYear[year] || 0) + result.pages;
    });

    if (!measurement.searched) {
        stats.singleVersion += 1;
        return;
    }

    if (result.pages === 0 && !measurement.searchFailedWithin60s) {
        stats.unused += 1;
    }
    if (measurement.searchFailedWithin10s) {
        stats.searchFailedWithin10s += 1;
    }
    if (measurement.searchFailedWithin60s) {
        stats.searchFailedWithin60s += 1;
    }
};

const runMeasurement = (params: MeasurementParams, run: Run) => {
    const startTime = Date.now();
    const cutoffTime = startTime - ONE_YEAR_MS;

    const plan = planMeasurement(params);
    const plannedTotal = plan.reduce((acc, { sample }) => acc + sample.length, 0);

    const summary: Summary = {
        params,
        startedAt: new Date(startTime).toISOString(),
        processed: 0,
        plannedTotal,
        errors: 0,
        searchMsTotal: 0,
        searchMsMax: 0,
        totals: {
            contents: 0,
            measured: 0,
            estimatedSnapshots: 0,
            estimatedSnapshotsLast12m: 0,
            searchFailedWithin10s: 0,
            searchFailedWithin60s: 0,
        },
        estimatedSnapshotsByYear: {},
        byType: {},
        top: [],
    };
    const results: ContentResult[] = [];

    logger.info(
        `${LOG_PREFIX} Started - measuring ${plannedTotal} contents: ${plan
            .map(({ type, total, sample }) => `${type} ${sample.length}/${total}`)
            .join(', ')}`
    );

    plan.forEach(({ type, total, sample }) => {
        const stats = createTypeStats(total);
        const snapshotsByYear: Record<string, number> = {};
        summary.byType[type] = stats;

        sample.forEach((contentRef) => {
            try {
                const measurement = measureContent(contentRef, cutoffTime);
                if (!measurement) {
                    stats.notFound += 1;
                } else {
                    addToTypeStats(stats, snapshotsByYear, measurement);
                    summary.searchMsTotal += measurement.searchMs;
                    summary.searchMsMax = Math.max(summary.searchMsMax, measurement.searchMs);

                    if (measurement.result.snapshots > 0) {
                        results.push(measurement.result);
                    }
                    if (measurement.searched) {
                        taskLib.sleep(THROTTLE_MS);
                    }
                }
            } catch (e) {
                summary.errors += 1;
                logger.error(
                    `${LOG_PREFIX} Failed for ${contentRef.contentId} [${contentRef.locale}] - ${e}`
                );
            }

            summary.processed += 1;
            taskLib.progress({
                current: summary.processed,
                total: plannedTotal,
                info: `${summary.processed}/${plannedTotal} - ${type}`,
            });

            if (summary.processed % 100 === 0) {
                logger.info(`${LOG_PREFIX} Progress ${summary.processed}/${plannedTotal}`);
            }
        });

        // Scale the sample up to all content of the type
        const scale = stats.measured > 0 ? total / stats.measured : 0;
        stats.estimatedSnapshots = Math.round(stats.snapshots * scale);
        stats.estimatedSnapshotsLast12m = Math.round(stats.snapshotsLast12m * scale);

        Object.keys(snapshotsByYear).forEach((year) => {
            summary.estimatedSnapshotsByYear[year] =
                (summary.estimatedSnapshotsByYear[year] || 0) +
                Math.round(snapshotsByYear[year] * scale);
        });

        const { totals } = summary;
        totals.contents += total;
        totals.measured += stats.measured;
        totals.estimatedSnapshots += stats.estimatedSnapshots;
        totals.estimatedSnapshotsLast12m += stats.estimatedSnapshotsLast12m;
        totals.searchFailedWithin10s += stats.searchFailedWithin10s;
        totals.searchFailedWithin60s += stats.searchFailedWithin60s;

        logger.info(`${LOG_PREFIX} Finished ${type} - ${JSON.stringify(stats)}`);
    });

    summary.top = results.sort((a, b) => b.snapshots - a.snapshots).slice(0, TOP_COUNT);
    summary.finishedAt = new Date().toISOString();
    summary.durationMinutes = Math.round((Date.now() - startTime) / 60000);

    const summaryJson = JSON.stringify(summary);

    taskLib.progress({ current: plannedTotal, total: plannedTotal, info: summaryJson });
    logger.info(`${LOG_PREFIX} Finished - ${summaryJson}`);

    // run.taskId is set when executeFunction returns, long before a measurement of any content
    // finishes
    if (!run.taskId) {
        return;
    }

    try {
        gridLib.getMap<ResultMap>(RESULT_MAP_ID).set({
            key: run.taskId,
            value: summaryJson,
            ttlSeconds: RESULT_TTL_SECONDS,
        });
    } catch (e) {
        logger.error(`${LOG_PREFIX} Could not save the result in the shared map - ${e}`);
    }
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

    const sampleParam = req.params.sample as string | undefined;
    if (sampleParam && sampleParam !== 'all' && !/^[1-9]\d*$/.test(sampleParam)) {
        return jsonResponse(400, {
            message: 'Parameter "sample" must be a positive integer or "all"',
        });
    }

    const sample =
        sampleParam === 'all' ? 'all' : sampleParam ? Number(sampleParam) : DEFAULT_SAMPLE_SIZE;

    const type = req.params.type as string | undefined;
    if (type && (!/^[a-z0-9.]+:[a-z0-9-]+$/i.test(type) || excludedTypes.indexOf(type) !== -1)) {
        return jsonResponse(400, {
            message: `Parameter "type" must be a content type other than ${excludedTypes.join(', ')}`,
        });
    }

    const params: MeasurementParams = { sample, type };
    const run: Run = { taskId: '' };

    run.taskId = taskLib.executeFunction({
        description: 'archive-dependency-stats',
        func: () => runInContext({ asAdmin: true }, () => runMeasurement(params, run)),
    });
    currentTaskId = run.taskId;

    return jsonResponse(202, { taskId: run.taskId });
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
    const savedResult = gridLib.getMap<ResultMap>(RESULT_MAP_ID).get(taskId) ?? undefined;

    if (!task) {
        return savedResult
            ? jsonResponse(200, { state: 'FINISHED', result: parseSummary(savedResult) })
            : jsonResponse(404, { message: `Task ${taskId} not found` });
    }

    const { state, node, progress } = task;

    return jsonResponse(200, {
        state,
        node,
        current: progress?.current,
        total: progress?.total,
        result:
            state === 'FINISHED'
                ? (parseSummary(progress?.info) ?? parseSummary(savedResult))
                : null,
    });
};
