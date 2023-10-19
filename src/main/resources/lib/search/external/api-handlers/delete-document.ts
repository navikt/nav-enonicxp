import httpClient from '/lib/http-client';
import { URLS } from '../../../constants';
import { logger } from '../../../utils/logging';

const SERVICE_URL = URLS.SEARCH_API_URL;

export const searchApiDeleteDocument = (documentId: string) => {
    logger.info(`Deleting ${documentId} from search index`);

    const response = httpClient.request({
        url: `${SERVICE_URL}/${documentId}`,
        method: 'DELETE',
        connectionTimeout: 10000,
    });

    logger.info(`Response from search api: ${JSON.stringify(response)}`);
};
