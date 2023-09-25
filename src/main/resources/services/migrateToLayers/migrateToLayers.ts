import * as taskLib from '/lib/xp/task';
import * as portalLib from '/lib/xp/portal';
import cacheLib from '/lib/cache';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { logger } from '../../lib/utils/logging';
import { parseJsonArray } from '../../lib/utils/array-utils';
import { generateUUID } from '../../lib/utils/uuid';
import { URLS } from '../../lib/constants';
import {
    ContentMigrationParams,
    migrateContentToLayer,
} from '../../lib/localization/layers-migration/migrate-content-to-layer';
import { toggleCacheInvalidationOnNodeEvents } from '../../lib/cache/invalidate-event-defer';

type LayerMigrationBatchJobResult = {
    status: string;
    current?: any;
    params: any;
    result: any;
};

type LayersMigrationResultCache = cacheLib.Cache & {
    getIfPresent: (key: string) => LayerMigrationBatchJobResult;
    put: (key: string, value: LayerMigrationBatchJobResult) => void;
};

const ONE_DAY = 60 * 60 * 24;

// TODO: cacheLib type def needs an update
const resultCache = cacheLib.newCache({
    size: 1000,
    expire: ONE_DAY,
}) as LayersMigrationResultCache;

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
                resultCache.put(jobId, {
                    status: `Migration job ${jobId} progress: [${index} / ${migrationParams.length}]`,
                    result: resultsAcc,
                    params: migrationParams,
                });

                try {
                    const result = migrateContentToLayer(params);
                    resultsAcc.push(result);
                } catch (e) {
                    resultsAcc.push(e);
                }
            });

            toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

            const durationSec = (Date.now() - start) / 1000;

            resultCache.put(jobId, {
                status: `Migration job ${jobId} completed in ${durationSec} sec.`,
                result: resultsAcc,
                params: migrationParams,
            });
        },
    });

    return {
        status: 200,
        body: {
            msg: 'Started batch migration job!',
            jobId,
            jobStatusUrl,
            params: migrationParams,
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
                message: 'Invalid body payload',
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

    return {
        status: 404,
        contentType: 'application/json',
    };
};
