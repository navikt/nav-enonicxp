import httpClient from '/lib/http-client';
import * as taskLib from '/lib/xp/task';
import { URLS } from '../constants';
import { logger } from '../utils/logging';

export const requestArchiveIndexing = (nodeId: string, locale: string, versionId: string) => {
    if (!URLS.ARCHIVE_ORIGIN) {
        return;
    }

    taskLib.executeFunction({
        description: `Archive indexing for ${nodeId}`,
        func: () => {
            try {
                const response = httpClient.request({
                    url: `${URLS.ARCHIVE_ORIGIN}/api/index?id=${nodeId}&locale=${locale}&versionId=${versionId}`,
                    method: 'POST',
                    headers: { secret: app.config.serviceSecret },
                    connectionTimeout: 5000,
                });
                if (response.status === 202) {
                    // TODO: fjerne info successful logging før produksjon?
                    logger.info(`Archive indexing requested for ${nodeId} (${locale})`);
                } else {
                    logger.warning(`Archive indexing failed for ${nodeId}: ${response.status}`);
                }
            } catch (e) {
                logger.error(`Archive indexing error for ${nodeId}: ${e}`);
            }
        },
    });
};
