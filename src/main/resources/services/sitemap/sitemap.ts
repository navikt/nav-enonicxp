import { getAllSitemapEntries, requestSitemapUpdate } from '../../lib/sitemap/sitemap';
import { logger } from '../../lib/utils/logging';

export const get = (req: XP.Request) => {
    const { secret } = req.headers;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Unauthorized',
            },
            contentType: 'application/json',
        };
    }

    const response = getAllSitemapEntries();

    if (!response || response.length === 0) {
        logger.warning('Sitemap data was requested but is not available!');

        requestSitemapUpdate();

        return {
            status: 500,
            body: { message: 'Internal server error - sitemap data not available' },
            contentType: 'application/json',
        };
    }

    return {
        status: 200,
        body: response,
        contentType: 'application/json',
    };
};
