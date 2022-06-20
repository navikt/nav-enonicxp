import httpClient from '/lib/http-client';
import { logger } from '../../lib/utils/logging';
import { clusterInfo } from '../../lib/utils/cluster-utils';

const sitecontentUrl =
    'http://localhost:8080/_/service/no.nav.navno/sitecontent?id=/www.nav.no/sadfasdf';
const cachePeriodMs = 3000;

const errorResponse = () => {
    return {
        status: 500,
        body: {
            message: 'Health-check failed - The error has been logged',
        },
        contentType: 'application/json',
    };
};

const okResponse = () => {
    return {
        status: 200,
        body: {
            message: 'Ok!',
        },
        contentType: 'application/json',
    };
};

export const get = () => {
    // Use cache on the sitecontent service to prevent spammy requests from overloading anything
    const cacheKey = Math.floor(Date.now() / cachePeriodMs);
    const url = `${sitecontentUrl}&cacheKey=${cacheKey}`;

    logger.info(cacheKey.toString());

    try {
        const response = httpClient.request({
            url,
            headers: {
                secret: app.config.serviceSecret,
            },
        });

        if (response.status >= 400 || response.contentType !== 'application/json') {
            logger.critical(
                `Bad response from health check request on server ${clusterInfo.localServerName} - ${response.status} ${response.message}`
            );

            return errorResponse();
        }

        return okResponse();
    } catch (e) {
        logger.critical(
            `Error from health check request on server ${clusterInfo.localServerName} - ${e}`
        );
        return errorResponse();
    }
};
