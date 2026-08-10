import { logger } from '../../utils/logging';
import { searchApiRequest } from './search-api-request';
import { isSearchIndexingEnabled } from '../utils';

export const searchApiDeleteDocument = (documentId: string) => {
    if (!isSearchIndexingEnabled()) {
        logger.info(
            `Search indexing is not enabled for this environment, skipping deletion of document ${documentId}`
        );
        return;
    }
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
