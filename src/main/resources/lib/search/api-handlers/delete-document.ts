import { logger } from '../../utils/logging';
import { searchApiRequest } from './search-api-request';

export const searchApiDeleteDocument = (documentId: string) => {
    const response = searchApiRequest({
        servicePath: `/${documentId}`,
        method: 'DELETE',
        connectionTimeout: 10000,
    });

    const logLevel = response.status < 400 ? 'info' : 'error';

    logger[logLevel](
        `Response from search/delete api for ${documentId}: ${response.status} - ${JSON.stringify(
            response.body
        )}`
    );
};
