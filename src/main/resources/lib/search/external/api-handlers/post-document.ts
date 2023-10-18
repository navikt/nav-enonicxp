import httpClient from '/lib/http-client';
import { logger } from '../../../utils/logging';
import { URLS } from '../../../constants';
import { ExternalSearchDocument } from '../document-builder';

const SERVICE_URL = URLS.SEARCH_API_URL;
const BATCH_SIZE = 100;

export const searchApiPostDocuments = (documents: ExternalSearchDocument[]) => {
    logger.info(`Posting ${documents.length} documents to search index`);

    const start = Date.now();

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const documentsBatch = documents.slice(i, i + BATCH_SIZE);

        try {
            const body = JSON.stringify(documentsBatch);

            logger.info(
                `[POST] Sending batch ${i} - ${i + documentsBatch.length} with size ${body.length}`
            );

            const response = httpClient.request({
                url: SERVICE_URL,
                method: 'POST',
                contentType: 'application/json',
                connectionTimeout: 30000,
                body,
            });

            logger.info(
                `[POST] Response from search api for batch ${i} - ${i + documentsBatch.length}: ${
                    response.status
                } - ${response.message}`
            );
        } catch (e) {
            logger.error(
                `Error from search index service for batch ${i} - ${
                    i + documentsBatch.length
                } - ${e}`
            );
        }
    }

    logger.info(
        `Finished posting ${documents.length} documents after ${Math.round(
            (Date.now() - start) / 1000
        )} seconds`
    );
};
