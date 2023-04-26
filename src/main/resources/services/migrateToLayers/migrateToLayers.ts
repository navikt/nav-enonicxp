import * as contentLib from '/lib/xp/content';
import * as taskLib from '/lib/xp/task';
import * as portalLib from '/lib/xp/portal';
import cacheLib from '/lib/cache';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { getLayersData } from '../../lib/localization/layers-data';
import { logger } from '../../lib/utils/logging';
import { parseJsonArray } from '../../lib/utils/array-utils';
import { migrateContentBatchToLayers } from '../../lib/localization/layers-migration/migration-batch-job';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { generateUUID } from '../../lib/utils/uuid';
import { URLS } from '../../lib/constants';

type Params = {
    sourceLocale: string;
    targetLocale: string;
    contentTypes: ContentDescriptor[];
    count: number;
    query?: string;
};

type JobResult = {
    status: string;
    params: Params;
    result: ReturnType<typeof migrateContentBatchToLayers>;
};

const ONE_DAY = 60 * 60 * 24;

// TODO: cacheLib type def needs an update
const resultCache = cacheLib.newCache({ size: 1000, expire: ONE_DAY }) as cacheLib.Cache & {
    getIfPresent: (key: string) => JobResult;
    put: (key: string, value: JobResult) => void;
};

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
    const { sourceLocale, targetLocale, contentTypes, query, count } = params;
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

    const countParsed = count && parseInt(count);
    if (!countParsed || isNaN(countParsed)) {
        logger.info(`Invalid count param: ${count}`);
        return null;
    }

    return {
        sourceLocale: sourceLocale || defaultLocale,
        targetLocale,
        query,
        contentTypes: contentTypesParsed,
        count: countParsed,
    };
};

const runMigrationJob = (params: Params, jobId: string) => {
    taskLib.executeFunction({
        description: `Layers migration job ${jobId}`,
        func: () => {
            resultCache.put(jobId, {
                status: `Migration job ${jobId} is in progress`,
                params,
                result: [],
            });

            const start = Date.now();

            const result = migrateContentBatchToLayers(params);

            const durationSec = (Date.now() - start) / 1000;

            resultCache.put(jobId, {
                status: `Migration job ${jobId} completed in ${durationSec} sec`,
                params,
                result,
            });
        },
    });
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
        body: {
            message: `Job status for ${jobId}`,
            jobStatus,
        },
        contentType: 'application/json',
    };
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

    runMigrationJob(params, jobId);

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
