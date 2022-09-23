import { fetchAndUpdateOfficeData } from '../../lib/officeData';
import { UpdateOfficeDataConfig } from './update-office-data-config';
import { logger } from '../../lib/utils/logging';

export const run = (config: UpdateOfficeDataConfig) => {
    logger.info('Running task for updating office information');
    fetchAndUpdateOfficeData(config.retry);
};
