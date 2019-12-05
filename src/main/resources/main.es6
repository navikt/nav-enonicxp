log.info('Started running main');
const cache = require('/lib/cacheControll');
const unpublish = require('/lib/cacheControll/unpublishTask');

cache.activateEventListener();
unpublish.start();
log.info('Finished running main');
