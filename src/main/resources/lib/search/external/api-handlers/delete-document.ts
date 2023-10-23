import httpClient from '/lib/http-client';
import { URLS } from '../../../constants';
import { logger } from '../../../utils/logging';

const SERVICE_URL = URLS.SEARCH_API_URL;

export const searchApiDeleteDocument = (documentId: string) => {
    const response = httpClient.request({
        url: `${SERVICE_URL}/${documentId}`,
        method: 'DELETE',
        connectionTimeout: 10000,
    });

    const logLevel = response.status < 300 ? 'info' : 'error';

    logger[logLevel](
        `Response from search/delete api for ${documentId}: ${response.status} - ${JSON.stringify(
            response.body
        )}`
    );
};
