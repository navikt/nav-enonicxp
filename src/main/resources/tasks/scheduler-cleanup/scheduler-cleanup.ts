import { logger } from '../../lib/utils/logging';
import { runSchedulerCleanup } from '../../lib/scheduling/schedule-cleanup';

export const run = () => {
    logger.info('Running scheduler cleanup task');
    runSchedulerCleanup();
};
