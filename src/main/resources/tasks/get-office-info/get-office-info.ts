import { updateOfficeInfo } from '../../lib/officeInformation';

export const run = () => {
    log.info('Running task for updating office information');
    updateOfficeInfo();
};
