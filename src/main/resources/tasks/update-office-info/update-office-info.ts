import { fetchAndUpdateOfficeInfo } from '../../lib/officeInformation';
import { UpdateOfficeInfoConfig } from './update-office-info-config';

export const run = (config: UpdateOfficeInfoConfig) => {
    fetchAndUpdateOfficeInfo(config.retry);
};
