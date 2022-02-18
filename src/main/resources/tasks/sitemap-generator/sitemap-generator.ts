import { requestSitemapUpdate } from '../../lib/sitemap/sitemap';

export const run = () => {
    log.info('Running task for triggering sitemap generation');

    requestSitemapUpdate();
};
