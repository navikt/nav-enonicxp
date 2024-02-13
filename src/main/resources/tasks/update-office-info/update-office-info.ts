import { fetchAndUpdateOfficeInfo } from '../../lib/office-pages/_legacy-office-information/legacy-office-update';
import { UpdateOfficeInfoConfig } from './update-office-info-config';

export const run = (config: UpdateOfficeInfoConfig) => {
    fetchAndUpdateOfficeInfo(config.retry);
};
