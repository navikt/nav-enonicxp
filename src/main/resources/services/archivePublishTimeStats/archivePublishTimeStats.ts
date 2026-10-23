import { Request } from '@enonic-types/core';
import * as taskLib from '/lib/xp/task';
import * as gridLib from '/lib/xp/grid';
import { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { getLayersData } from '../../lib/localization/layers-data';
import { NON_LOCALIZED_QUERY_FILTER } from '../../lib/localization/layers-repo-utils/localization-state-filters';
import { batchedNodeQuery } from '../../lib/utils/batched-query';
import { getRepoConnection } from '../../lib/repos/repo-utils';
import {
    getAllVersions,
    getVersionsForExternalArchive,
    VersionReferenceEnriched,
} from '../../lib/time-travel/get-published-versions';
import { runInContext } from '../../lib/context/run-in-context';
import { logger } from '../../lib/utils/logging';
import { NAVNO_NODE_ROOT_PATH } from '../../lib/constants';
import { RepoBranch } from '../../types/common';

// TEMPORARY - remove when the measurement is done.
//
// Measures how far the version timestamp, which the archive and time travel treat as the time a
// version was published, is from the time it was actually published. A version gets its timestamp
// when it is saved. It is published when it is pushed to master, which creates a commit. If
// publish.from is later than the commit, the version became visible at publish.from instead.
//
// Also checks that commit times are publish times: for the oldest published version of each
// content, the commit time should match publish.first. Read-only.
//
// POST ?sample=<n|all>&type=<content type>  starts the measurement on the node receiving the
//                                            request. sample is per content type (default 100).
//                                            all measures all content, without sampling
// GET ?taskId=<id>                           progress, and the result when finished
//
// XP removes finished tasks after 60 seconds, so the result is also kept in a shared map for a
// week, and logged with the prefix below.

const LOG_PREFIX = '[archive-publish-time-stats]';
const DEFAULT_SAMPLE_SIZE = 100;
const THROTTLE_EVERY = 50;
const THROTTLE_MS = 100;
const TOP_COUNT = 25;
const RESULT_MAP_ID = 'archive-publish-time-stats';
const RESULT_TTL_SECONDS = 60 * 60 * 24 * 7;

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

const CONTENT_QUERY = `_path LIKE "${NAVNO_NODE_ROOT_PATH}/*"`;

const excludedTypes = [
    'base:folder',
    'portal:template-folder',
    'portal:page-template',
    'portal:site',
];

const GAP_BUCKETS = [
    { key: 'under1m', maxMs: ONE_MINUTE_MS },
    { key: '1to10m', maxMs: 10 * ONE_MINUTE_MS },
    { key: '10to60m', maxMs: ONE_HOUR_MS },
    { key: '1to24h', maxMs: ONE_DAY_MS },
    { key: '1to7d', maxMs: 7 * ONE_DAY_MS },
    { key: 'over7d', maxMs: Infinity },
];

type MeasurementParams = { sample: number | 'all'; type?: string };

type ContentRef = { contentId: string; locale: string };

type PlannedType = { type: string; total: number; sample: ContentRef[] };

type RepoGetter = (locale: string, branch: RepoBranch) => RepoConnection | null;

type VersionTimes = {
    savedMs: number;
    committedMs: number;
    visibleMs: number;
    scheduled: boolean;
    committedAt: string;
};

type GapStats = {
    versions: number;
    missingTime: number;
    scheduled: number;
    commitBeforeSave: number;
    over1h: number;
    osloDateDiffers: number;
    gaps: Record<string, number>;
};

type TypeStats = GapStats & { total: number; measured: number; withoutVersions: number };

type FirstPublishCheck = {
    checked: number;
    within1m: number;
    within1h: number;
    over1h: number;
    missing: number;
};

type LargeGap = {
    contentId: string;
    locale: string;
    type: string;
    path: string;
    versionId: string;
    savedAt: string;
    committedAt: string;
    publishFrom?: string;
    gapHours: number;
};

type Summary = {
    params: MeasurementParams;
    startedAt: string;
    finishedAt?: string;
    durationMinutes?: number;
    processed: number;
    plannedTotal: number;
    errors: number;
    totals: GapStats & { contents: number; measured: number; withoutVersions: number };
    gapPercentilesHours: {
        count: number;
        p50: number;
        p90: number;
        p99: number;
        max: number;
    } | null;
    firstPublishCheck: FirstPublishCheck;
    byType: Record<string, TypeStats>;
    byYear: Record<string, GapStats>;
    top: LargeGap[];
};

type ResultMap = Record<string, string>;

// Lets the task read its own id, which is only known when executeFunction returns
type Run = { taskId: string };

let currentTaskId: string | null = null;

const createGapStats = (): GapStats => ({
    versions: 0,
    missingTime: 0,
    scheduled: 0,
    commitBeforeSave: 0,
    over1h: 0,
    osloDateDiffers: 0,
    gaps: GAP_BUCKETS.reduce<Record<string, number>>((acc, { key }) => {
        acc[key] = 0;
        return acc;
    }, {}),
});

const createTypeStats = (total: number): TypeStats => ({
    ...createGapStats(),
    total,
    measured: 0,
    withoutVersions: 0,
});

// XP timestamps can have more decimals than Date.parse handles in XP's script engine
const toUnixMs = (timestamp?: string | null) => {
    if (!timestamp) {
        return null;
    }

    const unixMs = Date.parse(timestamp.replace(/\.\d+/, ''));
    return isNaN(unixMs) ? null : unixMs;
};

const toHours = (ms: number) => Math.round((ms / ONE_HOUR_MS) * 10) / 10;

// 01:00 UTC on the last Sunday of the month, when Norwegian summer time starts (March) or ends
// (October)
const getLastSundayAt0100Utc = (year: number, month: number) => {
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 1));
    return lastDayOfMonth.getTime() - lastDayOfMonth.getUTCDay() * ONE_DAY_MS;
};

// Intl with time zones is not available in XP's script engine, so the summer time rules for
// Europe/Oslo are applied manually
const getOsloDate = (unixMs: number) => {
    const year = new Date(unixMs).getUTCFullYear();
    const isSummerTime =
        unixMs >= getLastSundayAt0100Utc(year, 2) && unixMs < getLastSundayAt0100Utc(year, 9);
    const offsetMs = (isSummerTime ? 2 : 1) * ONE_HOUR_MS;

    return new Date(unixMs + offsetMs).toISOString().slice(0, 10);
};

const createRepoGetter = (): RepoGetter => {
    const connections: Record<string, RepoConnection> = {};

    return (locale, branch) => {
        const repoId = getLayersData().localeToRepoIdMap[locale];
        if (!repoId) {
            return null;
        }

        const key = `${repoId}:${branch}`;
        if (!connections[key]) {
            connections[key] = getRepoConnection({ repoId, branch, asAdmin: true });
        }

        return connections[key];
    };
};

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

const findContentTypes = (repo: RepoConnection, type?: string) =>
    repo
        .query({
            start: 0,
            count: 0,
            query: CONTENT_QUERY,
            filters: getContentFilters(type),
            aggregations: { types: { terms: { field: 'type', size: 1000 } } },
        })
        .aggregations.types.buckets.map((bucket) => bucket.key);

const findContentIds = (repo: RepoConnection, type: string) =>
    batchedNodeQuery({
        repo,
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

const planMeasurement = (
    { sample, type }: MeasurementParams,
    getRepo: RepoGetter
): PlannedType[] => {
    const refsByType: Record<string, ContentRef[]> = {};

    getLayersData().locales.forEach((locale) => {
        const repo = getRepo(locale, 'master');
        if (!repo) {
            return;
        }

        findContentTypes(repo, type).forEach((contentType) => {
            if (!refsByType[contentType]) {
                refsByType[contentType] = [];
            }

            findContentIds(repo, contentType).forEach((contentId) => {
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

const getVersionTimes = (
    version: VersionReferenceEnriched,
    getRepo: RepoGetter
): VersionTimes | null => {
    if (!version.commitId) {
        return null;
    }

    const commit = getRepo(version.locale, 'master')?.getCommit({ id: version.commitId });
    const savedMs = toUnixMs(version.timestamp);
    const committedMs = toUnixMs(commit?.timestamp);

    if (!commit || savedMs === null || committedMs === null) {
        return null;
    }

    const publishFromMs = toUnixMs(version.publishFromTime);

    return {
        savedMs,
        committedMs,
        visibleMs: publishFromMs === null ? committedMs : Math.max(committedMs, publishFromMs),
        scheduled: publishFromMs !== null && publishFromMs > committedMs + ONE_MINUTE_MS,
        committedAt: commit.timestamp,
    };
};

const addToGapStats = (stats: GapStats, times: VersionTimes) => {
    const gapMs = times.visibleMs - times.savedMs;

    stats.versions += 1;

    if (times.scheduled) {
        stats.scheduled += 1;
    }
    if (times.committedMs < times.savedMs - ONE_MINUTE_MS) {
        stats.commitBeforeSave += 1;
    }
    if (gapMs >= ONE_HOUR_MS) {
        stats.over1h += 1;
    }
    if (getOsloDate(times.savedMs) !== getOsloDate(times.visibleMs)) {
        stats.osloDateDiffers += 1;
    }

    const bucket = GAP_BUCKETS.find(({ maxMs }) => gapMs < maxMs);
    if (bucket) {
        stats.gaps[bucket.key] += 1;
    }
};

const checkFirstPublish = (
    versions: VersionReferenceEnriched[],
    getRepo: RepoGetter,
    check: FirstPublishCheck
) => {
    // Versions are sorted newest first
    const oldest = versions[versions.length - 1];
    const times = getVersionTimes(oldest, getRepo);
    const content = getRepo(oldest.locale, 'draft')?.get<Content>({
        key: oldest.nodeId,
        versionId: oldest.versionId,
    });
    const publishFirstMs = toUnixMs(content?.publish?.first);

    check.checked += 1;

    if (!times || publishFirstMs === null) {
        check.missing += 1;
        return;
    }

    const diffMs = Math.abs(times.committedMs - publishFirstMs);
    if (diffMs < ONE_MINUTE_MS) {
        check.within1m += 1;
    } else if (diffMs < ONE_HOUR_MS) {
        check.within1h += 1;
    } else {
        check.over1h += 1;
    }
};

const getPercentilesHours = (gaps: number[]) => {
    if (gaps.length === 0) {
        return null;
    }

    const sorted = gaps.slice().sort((a, b) => a - b);
    const at = (quantile: number) =>
        toHours(sorted[Math.min(sorted.length - 1, Math.floor(quantile * sorted.length))]);

    return {
        count: sorted.length,
        p50: at(0.5),
        p90: at(0.9),
        p99: at(0.99),
        max: toHours(sorted[sorted.length - 1]),
    };
};

const runMeasurement = (params: MeasurementParams, run: Run) => {
    const startTime = Date.now();
    const getRepo = createRepoGetter();

    const plan = planMeasurement(params, getRepo);
    const plannedTotal = plan.reduce((acc, { sample }) => acc + sample.length, 0);

    const summary: Summary = {
        params,
        startedAt: new Date(startTime).toISOString(),
        processed: 0,
        plannedTotal,
        errors: 0,
        totals: { ...createGapStats(), contents: 0, measured: 0, withoutVersions: 0 },
        gapPercentilesHours: null,
        firstPublishCheck: { checked: 0, within1m: 0, within1h: 0, over1h: 0, missing: 0 },
        byType: {},
        byYear: {},
        top: [],
    };
    const gapsOver1m: number[] = [];
    const largeGaps: LargeGap[] = [];

    logger.info(
        `${LOG_PREFIX} Started - measuring ${plannedTotal} contents: ${plan
            .map(({ type, total, sample }) => `${type} ${sample.length}/${total}`)
            .join(', ')}`
    );

    plan.forEach(({ type, total, sample }) => {
        const stats = createTypeStats(total);
        summary.byType[type] = stats;
        summary.totals.contents += total;

        sample.forEach(({ contentId, locale }) => {
            try {
                const allVersions = getAllVersions(contentId, locale);

                stats.measured += 1;
                summary.totals.measured += 1;

                if (allVersions.length === 0) {
                    stats.withoutVersions += 1;
                    summary.totals.withoutVersions += 1;
                } else {
                    getVersionsForExternalArchive(allVersions).forEach((version) => {
                        const times = getVersionTimes(version, getRepo);
                        if (!times) {
                            stats.missingTime += 1;
                            summary.totals.missingTime += 1;
                            return;
                        }

                        const year = getOsloDate(times.visibleMs).slice(0, 4);
                        if (!summary.byYear[year]) {
                            summary.byYear[year] = createGapStats();
                        }

                        addToGapStats(stats, times);
                        addToGapStats(summary.totals, times);
                        addToGapStats(summary.byYear[year], times);

                        const gapMs = times.visibleMs - times.savedMs;
                        if (gapMs >= ONE_MINUTE_MS) {
                            gapsOver1m.push(gapMs);
                        }
                        if (gapMs >= ONE_HOUR_MS) {
                            largeGaps.push({
                                contentId,
                                locale,
                                type,
                                path: version.nodePath,
                                versionId: version.versionId,
                                savedAt: version.timestamp,
                                committedAt: times.committedAt,
                                publishFrom: version.publishFromTime,
                                gapHours: toHours(gapMs),
                            });
                        }
                    });

                    checkFirstPublish(allVersions, getRepo, summary.firstPublishCheck);
                }
            } catch (e) {
                summary.errors += 1;
                logger.error(`${LOG_PREFIX} Failed for ${contentId} [${locale}] - ${e}`);
            }

            summary.processed += 1;
            taskLib.progress({
                current: summary.processed,
                total: plannedTotal,
                info: `${summary.processed}/${plannedTotal} - ${type}`,
            });

            if (summary.processed % THROTTLE_EVERY === 0) {
                taskLib.sleep(THROTTLE_MS);
            }
            if (summary.processed % 1000 === 0) {
                logger.info(`${LOG_PREFIX} Progress ${summary.processed}/${plannedTotal}`);
            }
        });

        logger.info(`${LOG_PREFIX} Finished ${type} - ${JSON.stringify(stats)}`);
    });

    summary.gapPercentilesHours = getPercentilesHours(gapsOver1m);
    summary.top = largeGaps.sort((a, b) => b.gapHours - a.gapHours).slice(0, TOP_COUNT);
    summary.finishedAt = new Date().toISOString();
    summary.durationMinutes = Math.round((Date.now() - startTime) / 60000);

    const summaryJson = JSON.stringify(summary);

    taskLib.progress({ current: plannedTotal, total: plannedTotal, info: summaryJson });
    logger.info(`${LOG_PREFIX} Finished - ${summaryJson}`);

    // run.taskId is set when executeFunction returns, long before the measurement finishes
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
        description: 'archive-publish-time-stats',
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
