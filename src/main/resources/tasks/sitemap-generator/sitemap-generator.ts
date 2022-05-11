import { requestSitemapUpdate } from '../../lib/sitemap/sitemap';
import { logger } from '../../lib/utils/logging';

export const run = () => {
    logger.info('Running task for triggering sitemap generation');

    requestSitemapUpdate();
};
