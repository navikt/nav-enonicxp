import { fetchAndUpdateOfficeInfo } from '../../lib/office-pages/_legacy-office-information/legacy-office-update';
import { UpdateOfficeInfo } from 'tasks/update-office-info';

export const run = (config: UpdateOfficeInfo) => {
    fetchAndUpdateOfficeInfo(config.retry);
};
