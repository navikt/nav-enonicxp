import httpClient from '/lib/http-client';
import { logger } from '../../lib/utils/logging';
import { clusterInfo, getLocalServerName } from '../../lib/utils/cluster-utils';

const sitecontentUrl = `http://localhost:8080/_/service/no.nav.navno/sitecontent?id=/www.nav.no/`;

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

const checkPeriod = 3000;
let lastCheckTime = 0;
let lastCheckResponse = {};

export const get = (req: XP.Request) => {
    const time = Date.now();

    if (time - lastCheckTime < checkPeriod) {
        return lastCheckResponse;
    }

    lastCheckTime = time;

    try {
        const response = httpClient.request({
            url: sitecontentUrl,
            headers: {
                secret: app.config.serviceSecret,
            },
        });

        logger.info(response.contentType);

        if (response.status >= 400 || response.contentType !== 'application/json') {
            logger.critical(
                `Bad response from health check request - ${response.status} ${response.message}`
            );

            lastCheckResponse = errorResponse();
        } else {
            lastCheckResponse = okResponse();
        }
    } catch (e) {
        logger.critical(`Error from health check request - ${e}`);
        lastCheckResponse = errorResponse();
    }

    logger.info(`Response on ${clusterInfo.localServerName}: ${JSON.stringify(lastCheckResponse)}`);

    return lastCheckResponse;
};
