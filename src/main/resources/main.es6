log.info('Started running main');

require('/lib/polyfills');
const { getTableFromFile } = require('/lib/menu-utils/url-lookup-table.es6');
const cache = require('/lib/siteCache');
const invalidator = require('/lib/siteCache/invalidator');
const officeInformation = require('/lib/officeInformation');
const clusterLib = require('/lib/xp/cluster');
const facetLib = require('/lib/facets');

let appIsRunning = true;

// start pull from NORG
officeInformation.startCronJob();
// start cache invalidator
cache.activateEventListener();

// init url lookup table
if (app.config.env !== 'p') {
    getTableFromFile();
}

// start task for handling caching of expired and prepublished content
if (clusterLib.isMaster()) {
    // make sure the lock is released on startup
    invalidator.releaseInvalidatorLock();

    // make sure the updateAll lock is released on startup
    const facetValidation = facetLib.getFacetValidation();
    if (facetValidation) {
        facetLib.setUpdateAll(false);
    }
}

invalidator.start(appIsRunning);
facetLib.activateEventListener();

log.info('Finished running main');

__.disposer(() => {
    // when the app is closed down, tasks might have survived and should not
    // spawn of new tasks. We keep this state to make sure of this.
    appIsRunning = false;
});
