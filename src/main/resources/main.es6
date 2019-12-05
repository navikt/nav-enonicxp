log.info('Started running main');
const cache = require('/lib/cacheControll');
const unpublish = require('/lib/cacheControll/unpublishTask');
const officeInformation = require('/lib/officeInformation');

cache.activateEventListener();
officeInformation.startCronJob();
unpublish.start();
log.info('Finished running main');
