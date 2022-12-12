import { initApp } from './lib/initApp';

log.info('Started running main');

initApp();

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
