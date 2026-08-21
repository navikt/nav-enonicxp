import { HttpRequestParams, request } from '/lib/http-client';
import {
    NORG2_CONSUMER_ID,
    NORG_PROXY_TARGET_APP,
    NORG_PROXY_TARGET_CLIENT_ID,
    NORG_PROXY_TOKEN_SCOPE,
} from '../constants';
import { parseJsonToArray } from './array-utils';
import { getAzureAdToken } from './azure-ad-token';
import { logger } from './logging';

type NorgProxyRequestParams = Pick<HttpRequestParams, 'url' | 'method' | 'body'>;

export const norgProxyRequest = <T>(
    requestConfig: NorgProxyRequestParams,
    logContext = 'NorgProxyRequest'
): T[] | null => {
    const accessToken = getAzureAdToken(NORG_PROXY_TOKEN_SCOPE);

    if (!accessToken) {
        logger.error(`${logContext}: Could not acquire EntraID token for request to ${requestConfig.url}`);
        return null;
    }

    const response = request({
        url: requestConfig.url,
        method: requestConfig.method,
        contentType: 'application/json',
        headers: {
            consumerId: NORG2_CONSUMER_ID,
            Authorization: `Bearer ${accessToken}`,
            'target-client-id': NORG_PROXY_TARGET_CLIENT_ID,
            'target-app': NORG_PROXY_TARGET_APP,
        },
        body: requestConfig.body,
    });

    if (response.status !== 200 || !response.body) {
        logger.error(
            `${logContext}: Bad response: ${response.status} - ${response.message}, ${requestConfig.url}`
        );
        return null;
    }

    return parseJsonToArray<T>(response.body);
};
