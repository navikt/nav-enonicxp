import * as contentLib from '/lib/xp/content';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { getLayersData } from '../../lib/localization/layers-data';
import { logger } from '../../lib/utils/logging';

type Params = {
    sourceLocale?: string;
    targetLocale: string;
    contentTypes: string[];
    query?: string;
};

const validateQuery = (query: string) => {
    try {
        contentLib.query({ count: 0, query });
    } catch (e) {
        logger.error(`Invalid query: ${query} - Error: ${e}`);
        return false;
    }
};

const validateParams = (params: any): params is Params => {
    const { sourceLocale, targetLocale, contentTypes, query } = params;

    const { locales } = getLayersData();

    const targetLocaleIsValid = typeof targetLocale === 'string' && locales.includes(targetLocale);

    const sourceLocaleIsValid =
        !sourceLocale || (typeof sourceLocale === 'string' && locales.includes(sourceLocale));

    const contentTypesIsValid =
        Array.isArray(contentTypes) &&
        contentTypes.every((contentType) => typeof contentType === 'string');

    const queryIsValid = !query || validateQuery(query);

    return !!(targetLocaleIsValid && sourceLocaleIsValid && contentTypesIsValid && queryIsValid);
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

    const { params } = req;

    if (!validateParams(params)) {
        return {
            status: 400,
            body: {
                message: 'Invalid parameters specified',
            },
            contentType: 'application/json',
        };
    }

    logger.info('Great success');

    return {
        status: 200,
        body: {
            message: 'Great success!',
        },
        contentType: 'application/json',
    };
};
