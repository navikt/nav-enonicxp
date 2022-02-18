import { fetchAndUpdateOfficeInfo } from '../../lib/officeInformation';
import { UpdateOfficeInfoConfig } from './update-office-info-config';

export const run = (config: UpdateOfficeInfoConfig) => {
    log.info('Running task for updating office information');
    fetchAndUpdateOfficeInfo(config.retry);
};
