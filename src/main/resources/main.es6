log.info('Started running main');

require('/lib/polyfills');
const cache = require('/lib/siteCache');
const officeInformation = require('/lib/officeInformation');
const clusterLib = require('/lib/xp/cluster');
const facetLib = require('/lib/facets');
const sitemap = require('/lib/sitemap/sitemap');
const { hookLibsWithTimeTravel } = require('/lib/time-travel/run-with-time-travel');

let appIsRunning = true;

if (app.config.env !== 'localhost') {
    // start pull from NORG
    officeInformation.startCronJob();
}

// start cache invalidator
cache.activateCacheEventListeners();

// listen for updated sitemap-data from master
sitemap.activateDataUpdateEventListener();

// generate initial sitemap data and start periodic regeneration
sitemap.generateDataAndActivateSchedule();

// enable retrieval of version history data from a specified date-time
hookLibsWithTimeTravel();

if (clusterLib.isMaster()) {
    // make sure the updateAll lock is released on startup, and clear the
    // list of recently validated nodes
    const facetValidation = facetLib.getFacetValidation();
    if (facetValidation) {
        facetLib.clearUpdateState();
    }
}

facetLib.activateEventListener();

log.info('Finished running main');

__.disposer(() => {
    // when the app is closed down, tasks might have survived and should not
    // spawn of new tasks. We keep this state to make sure of this.
    appIsRunning = false;
});
