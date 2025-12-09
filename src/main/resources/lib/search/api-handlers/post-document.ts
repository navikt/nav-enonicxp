import * as taskLib from '/lib/xp/task';
import { logger } from '../../utils/logging';
import { SearchDocument } from '../document-builder/document-builder';
import { searchApiRequest } from './search-api-request';

type PostAPILogMessage = {
    status: number;
    body: any;
    batchStart: number;
    batchEnd: number;
    documents?: SearchDocument[];
};

const BATCH_SIZE = 100;

// This won't be thread safe, but problems here should be very unlikely, and in any case the
// consequences are not significant (some concurrent requests may occur)
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

const createLogMessage = (message: PostAPILogMessage) => {
    const baseMessage = `Response from search/post api for batch ${message.batchStart} - ${message.batchEnd}: ${message.status} - ${JSON.stringify(message.body)}`;

    if (!message.documents) {
        return baseMessage;
    }

    const documentInfo =
        message.documents.length <= 20
            ? JSON.stringify(message.documents)
            : JSON.stringify(message.documents.map((doc) => doc.id));

    const label = message.documents.length <= 20 ? 'Documents' : 'Document ids';

    return `${baseMessage} - ${label}: ${documentInfo}`;
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

    const start = Date.now();

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const documentsBatch = documents.slice(i, i + BATCH_SIZE);

        try {
            const response = searchApiRequest({
                method: 'POST',
                contentType: 'application/json',
                connectionTimeout: 30000,
                body: JSON.stringify(documentsBatch),
            });

            const logLevel = response.status < 300 ? 'info' : 'error';

            logger[logLevel](
                createLogMessage({
                    status: response.status,
                    body: response.body,
                    batchStart: i,
                    batchEnd: i + documentsBatch.length,
                    // If something went wrong, log document info for investigation.
                    // Log full documents if batch is small, otherwise just IDs.
                    documents:
                        logLevel === 'error' && documentsBatch.length <= 20
                            ? documentsBatch
                            : undefined,
                })
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
