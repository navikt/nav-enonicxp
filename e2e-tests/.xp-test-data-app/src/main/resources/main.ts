// import { initTestData } from './init-test-data';

log.info('Generating test data');

// initTestData();

log.info('Finished generating test data');

__.disposer(() => {
    log.info('Test data generator is shutting down');
});
