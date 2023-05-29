import * as contentLib from '/lib/xp/content';
import * as taskLib from '/lib/xp/task';
import * as portalLib from '/lib/xp/portal';
import cacheLib from '/lib/cache';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { getLayersData } from '../../lib/localization/layers-data';
import { logger } from '../../lib/utils/logging';
import { parseJsonArray } from '../../lib/utils/array-utils';
import {
    LayersMigrationResultCache,
    migrateContentBatchToLayers,
} from '../../lib/localization/layers-migration/migration-batch-job';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { generateUUID } from '../../lib/utils/uuid';
import { URLS } from '../../lib/constants';
import {
    ContentMigrationParams,
    migrateContentToLayer,
} from '../../lib/localization/layers-migration/migrate-content-to-layer';
import { toggleCacheInvalidationOnNodeEvents } from '../../lib/cache/invalidate-event-defer';

type Params = {
    sourceLocale: string;
    targetLocale: string;
    contentTypes: ContentDescriptor[];
    maxCount: number;
    query?: string;
    dryRun?: boolean;
};

const ONE_DAY = 60 * 60 * 24;

// TODO: cacheLib type def needs an update
const resultCache = cacheLib.newCache({
    size: 1000,
    expire: ONE_DAY,
}) as LayersMigrationResultCache;

const validateQuery = (query: string) => {
    try {
        contentLib.query({ count: 0, query });
        return true;
    } catch (e) {
        logger.error(`Invalid query: ${query} - Error: ${e}`);
        return false;
    }
};

const parseAndValidateParams = (params: XP.Request['params']): Params | null => {
    const { sourceLocale, targetLocale, contentTypes, query, maxCount } = params;
    const { locales, defaultLocale } = getLayersData();

    const targetLocaleIsValid = typeof targetLocale === 'string' && locales.includes(targetLocale);
    if (!targetLocaleIsValid) {
        logger.info(`Invalid targetLocale param: ${targetLocale}`);
        return null;
    }

    const sourceLocaleIsValid =
        typeof sourceLocale === 'undefined' || locales.includes(sourceLocale);
    if (!sourceLocaleIsValid) {
        logger.info(`Invalid sourceLocale param: ${sourceLocale}`);
        return null;
    }

    const contentTypesParsed = contentTypes && parseJsonArray(contentTypes);

    const contentTypesIsValid =
        contentTypesParsed &&
        contentTypesParsed.every((contentType) => typeof contentType === 'string');
    if (!contentTypesIsValid) {
        logger.info(`Invalid contentTypes param: ${contentTypes}`);
        return null;
    }

    const queryIsValid = !query || validateQuery(query);
    if (!queryIsValid) {
        logger.info(`Invalid query param: ${query}`);
        return null;
    }

    const countParsed = maxCount && parseInt(maxCount);
    if (!countParsed || isNaN(countParsed)) {
        logger.info(`Invalid maxCount param: ${maxCount}`);
        return null;
    }

    return {
        sourceLocale: sourceLocale || defaultLocale,
        targetLocale,
        query,
        contentTypes: contentTypesParsed,
        maxCount: countParsed,
        dryRun: params.dryRun === 'true',
    };
};

const runMigrationJob = (params: Params, jobId: string, dryRun?: boolean) => {
    taskLib.executeFunction({
        description: `Layers migration job ${jobId}`,
        func: () => {
            resultCache.put(jobId, {
                status: `Migration job ${jobId} started`,
                params,
                result: [],
            });

            const start = Date.now();

            toggleCacheInvalidationOnNodeEvents({ shouldDefer: true });
            const result = migrateContentBatchToLayers(params, jobId, resultCache, dryRun);
            toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

            const durationSec = (Date.now() - start) / 1000;
            const withErrors = result.filter((result) => result.errors.length > 0);

            resultCache.put(jobId, {
                status: `${
                    params.dryRun ? '[DRY RUN] ' : ''
                }Migration job ${jobId} completed in ${durationSec} sec. ${
                    withErrors.length
                } contents had errors.`,
                params,
                result,
            });
        },
    });
};

const runPresetMigrationJob = (migrationParams: ContentMigrationParams[]) => {
    const jobId = generateUUID();
    const serviceUrl = portalLib.serviceUrl({ service: 'migrateToLayers' });
    const jobStatusUrl = `${URLS.XP_ORIGIN}${serviceUrl}?status=${jobId}`;

    logger.info(`Running layers migration job ${jobId} for ${migrationParams.length} contents`);

    taskLib.executeFunction({
        description: `Layers migration job ${jobId}`,
        func: () => {
            resultCache.put(jobId, {
                status: `Migration job ${jobId} started`,
                params: migrationParams,
                result: [],
            });

            const start = Date.now();

            const resultsAcc: any[] = [];

            toggleCacheInvalidationOnNodeEvents({ shouldDefer: true });
            migrationParams.forEach((params, index) => {
                const result = migrateContentToLayer(params);
                resultsAcc.push(result);

                resultCache.put(jobId, {
                    status: `Migration job ${jobId} progress: [${index + 1} / ${
                        migrationParams.length
                    }]`,
                    result: resultsAcc,
                    params,
                });
            });
            toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

            const durationSec = (Date.now() - start) / 1000;

            resultCache.put(jobId, {
                ...resultCache.getIfPresent(jobId),
                status: `Migration job ${jobId} completed in ${durationSec} sec.`,
            });
        },
    });

    return {
        status: 200,
        body: {
            msg: 'Started batch migration job!',
            params: migrationParams,
            jobId,
            jobStatusUrl,
        },
        contentType: 'application/json',
    };
};

const getJobStatus = (jobId: string) => {
    const jobStatus = resultCache.getIfPresent(jobId);
    if (!jobStatus) {
        return {
            status: 404,
            body: {
                message: `No job status found for ${jobId}`,
            },
            contentType: 'application/json',
        };
    }

    return {
        status: 200,
        body: jobStatus,
        contentType: 'application/json',
    };
};

export const post = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const contantToMigrateArray = parseJsonArray(req.body);
    if (!contantToMigrateArray) {
        return {
            status: 400,
            body: {
                message: 'Invalid parameter "contentToMigrate"',
            },
            contentType: 'application/json',
        };
    }

    return runPresetMigrationJob(contantToMigrateArray);
};

export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    if (req.params.status) {
        return getJobStatus(req.params.status);
    }

    const params = parseAndValidateParams(req.params);
    if (!params) {
        return {
            status: 400,
            body: {
                message: 'Invalid parameters specified',
            },
            contentType: 'application/json',
        };
    }

    const jobId = generateUUID();
    const serviceUrl = portalLib.serviceUrl({ service: 'migrateToLayers' });
    const jobStatusUrl = `${URLS.XP_ORIGIN}${serviceUrl}?status=${jobId}`;

    logger.info(`Running layers migration job ${jobId} with params ${JSON.stringify(params)}`);

    runMigrationJob(params, jobId, params.dryRun);

    return {
        status: 200,
        body: {
            msg: 'Started batch migration job!',
            params,
            jobId,
            jobStatusUrl,
        },
        contentType: 'application/json',
    };
};
