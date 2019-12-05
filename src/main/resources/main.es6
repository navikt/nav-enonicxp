const cache = require('/lib/cacheControll');
const unpublish = require('/lib/cacheControll/unpublishTask');
const officeInformation = require('/lib/officeInformation');

cache.activateEventListener();
unpublish.setupTask();
officeInformation.startCronJob();
