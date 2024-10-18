import { logger } from '../../lib/utils/logging';
import { unpublishOldNews } from '../../lib/scheduling/unpublish-old-news';

export const run = () => {
    logger.info('Running unpublish old news task');
    unpublishOldNews();
};
