import { HttpRequestParams, request } from '/lib/http-client';
import {
    IS_ENONIC_POC,
    NORG2_CONSUMER_ID,
    NORG_PROXY_TARGET_APP,
    NORG_PROXY_TARGET_CLIENT_ID,
    NORG_PROXY_TOKEN_SCOPE,
} from '../constants';
import { parseJsonToArray } from './array-utils';
import { getAzureAdToken } from './azure-ad-token';
import { logger } from './logging';

type NorgProxyRequestParams = Pick<HttpRequestParams, 'url' | 'method' | 'body'>;

// Direct call to norg2, used by every environment except the Enonic Cloud PoC (dev3), which
// cannot reach norg2 directly and must go through org-ekstern-proxy (see below).
const norgDirectRequest = <T>(
    requestConfig: NorgProxyRequestParams,
    logContext: string
): T[] | null => {
    const response = request({
        url: requestConfig.url,
        method: requestConfig.method,
        contentType: 'application/json',
        headers: {
            consumerId: NORG2_CONSUMER_ID,
        },
        body: requestConfig.body,
    });

    if (response.status !== 200 || !response.body) {
        logger.error(
            `${logContext}: Bad response from norg2: ${response.status} - ${response.message}, ${requestConfig.url}`
        );
        return null;
    }

    return parseJsonToArray<T>(response.body);
};

export const norgProxyRequest = <T>(
    requestConfig: NorgProxyRequestParams,
    logContext = 'NorgProxyRequest'
): T[] | null => {
    if (!IS_ENONIC_POC) {
        return norgDirectRequest<T>(requestConfig, logContext);
    }

    const accessToken = getAzureAdToken(NORG_PROXY_TOKEN_SCOPE);

    if (!accessToken) {
        logger.error(
            `${logContext}: Could not acquire EntraID token for request to ${requestConfig.url}`
        );
        return null;
    }

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'target-client-id': NORG_PROXY_TARGET_CLIENT_ID,
        'target-app': NORG_PROXY_TARGET_APP,
    };

    const response = request({
        url: requestConfig.url,
        method: requestConfig.method,
        contentType: 'application/json',
        headers,
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
