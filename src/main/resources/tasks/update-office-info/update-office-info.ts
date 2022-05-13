import { fetchAndUpdateOfficeInfo } from '../../lib/officeInformation';
import { UpdateOfficeInfoConfig } from './update-office-info-config';
import { logger } from '../../lib/utils/logging';

export const run = (config: UpdateOfficeInfoConfig) => {
    logger.info('Running task for updating office information');
    fetchAndUpdateOfficeInfo(config.retry);
};
