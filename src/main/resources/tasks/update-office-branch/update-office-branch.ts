import { runOfficeBranchFetchTask } from '../../lib/officeBranch';
import { logger } from '../../lib/utils/logging';

export const run = () => {
    logger.info('Running task for updating office information');
    runOfficeBranchFetchTask();
};
