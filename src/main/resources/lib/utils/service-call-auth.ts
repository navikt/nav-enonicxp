import { IS_ENONIC_POC } from '../constants';
import { getAzureAdToken } from './azure-ad-token';
import { logger } from './logging';

export const withCloudServiceAuthHeaders = (
    baseHeaders: Record<string, string>,
    scope: string,
    logContext = 'CloudServiceAuth'
): Record<string, string> => {
    if (!IS_ENONIC_POC) {
        return baseHeaders;
    }

    const accessToken = getAzureAdToken(scope);
    if (!accessToken) {
        logger.error(`${logContext}: Could not acquire EntraID token for outbound request`);
        return baseHeaders;
    }

    return {
        ...baseHeaders,
        Authorization: `Bearer ${accessToken}`,
    };
};
