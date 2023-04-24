import * as contentLib from '/lib/xp/content';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { getLayersData } from '../../lib/localization/layers-data';
import { logger } from '../../lib/utils/logging';
import { parseJsonArray } from '../../lib/utils/array-utils';
import { migrateContentBatchToLayers } from '../../lib/localization/layers-migration/migration-batch-job';
import { ContentDescriptor } from '../../types/content-types/content-config';

type Params = {
    sourceLocale: string;
    targetLocale: string;
    contentTypes: ContentDescriptor[];
    count: number;
    query?: string;
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

    logger.info(`Migration params: ${JSON.stringify(params)}`);

    const errors = migrateContentBatchToLayers(params);

    if (errors.length === 0) {
        return {
            status: 200,
            body: {
                message: 'Great success!',
            },
            contentType: 'application/json',
        };
    }

    return {
        status: 200,
        body: {
            message: `Migration job had errors: ${errors.join(' || ')}`,
        },
        contentType: 'application/json',
    };
};
