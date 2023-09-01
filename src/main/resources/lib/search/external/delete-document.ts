import * as taskLib from '/lib/xp/task';
import httpClient from '/lib/http-client';
import { logger } from '../../utils/logging';
import { URLS } from '../../constants';
import { generateSearchDocumentId } from './utils';

const SERVICE_URL = URLS.SEARCH_API_URL;

const deleteDocument = (id: string) => {
    logger.info(`Deleting ${id} from search index`);

    const response = httpClient.request({
        url: `${SERVICE_URL}/${id}`,
        method: 'DELETE',
        connectionTimeout: 10000,
    });

    logger.info(`[DELETE] Response from search api: ${JSON.stringify(response)}`);
};
const _externalSearchDeleteDocument = (contentId: string, locale: string) => {
    const id = generateSearchDocumentId(contentId, locale);

    taskLib.executeFunction({
        description: `Deleting document from external search index for ${id}`,
        func: () => deleteDocument(id),
    });
};

export const externalSearchDeleteDocument = SERVICE_URL
    ? _externalSearchDeleteDocument
    : () => ({});
