import * as taskLib from '/lib/xp/task';
import httpClient from '/lib/http-client';
import { logger } from '../../../utils/logging';
import { URLS } from '../../../constants';
import { SearchDocument } from '../document-builder/document-builder';

const SERVICE_URL = URLS.SEARCH_API_URL;
const BATCH_SIZE = 100;

// This won't be thread safe, but problems here should be very unlikely, and in any case the
// consequences are not significant (some document-batches may be sent twice)
const queueState: { isBusy: boolean; queue: SearchDocument[] } = {
    isBusy: false,
    queue: [],
};

export const searchApiPostDocumentsAsync = (documents: SearchDocument[]) => {
    taskLib.executeFunction({
        description: `Sending document batch to search api`,
        func: () => searchApiPostDocuments(documents),
    });
};

export const searchApiPostDocuments = (documents: SearchDocument[]) => {
    if (queueState.isBusy) {
        queueState.queue.push(...documents);
        logger.info(
            `Search api handler is busy, queueing ${documents.length} documents for processing`
        );
        return;
    }

    queueState.isBusy = true;

    logger.info(`Posting ${documents.length} documents to search index`);

    const start = Date.now();

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const documentsBatch = documents.slice(i, i + BATCH_SIZE);

        try {
            const body = JSON.stringify(documentsBatch);

            logger.info(
                `Sending batch ${i} - ${i + documentsBatch.length} with size ${body.length}`
            );

            const response = httpClient.request({
                url: SERVICE_URL,
                method: 'POST',
                contentType: 'application/json',
                connectionTimeout: 30000,
                body,
            });

            logger.info(
                `Response from search api for batch ${i} - ${i + documentsBatch.length}: ${
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

    queueState.isBusy = false;

    if (queueState.queue.length > 0) {
        const queue = queueState.queue;
        queueState.queue = [];
        searchApiPostDocuments(queue);
    }
};
