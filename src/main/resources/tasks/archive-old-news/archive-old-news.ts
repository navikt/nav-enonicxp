import { logger } from '../../lib/utils/logging';
import { archiveOldNews } from '../../lib/archiving/archive-old-news';

export const run = () => {
    logger.info('Running archive old news task');
    archiveOldNews();
};
