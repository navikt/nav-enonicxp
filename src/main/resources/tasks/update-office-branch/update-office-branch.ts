import { fetchAndUpdateOfficeBranch } from '../../lib/officeBranch';
import { UpdateOfficeBranchConfig } from './update-office-branch-config';
import { logger } from '../../lib/utils/logging';

export const run = (config: UpdateOfficeBranchConfig) => {
    logger.info('Running task for updating office information');
    fetchAndUpdateOfficeBranch(config.retry);
};
