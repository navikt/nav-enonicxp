log.info('Started running main');

require('/lib/polyfills');

import clusterLib from '/lib/xp/cluster';
import { startOfficeInfoSchedule } from './lib/officeInformation';
import { activateCacheEventListeners } from './lib/siteCache';
import {
    activateSitemapDataUpdateEventListener,
    generateSitemapDataAndActivateSchedule,
} from './lib/sitemap/sitemap';

const invalidator = require('/lib/siteCache/invalidator');
const facetLib = require('/lib/facets');
const { hookLibsWithTimeTravel } = require('/lib/time-travel/run-with-time-travel');

let appIsRunning = true;

// start pull from NORG
startOfficeInfoSchedule();

// start cache invalidator
activateCacheEventListeners();

// listen for updated sitemap-data from master
activateSitemapDataUpdateEventListener();

// generate initial sitemap data and start periodic regeneration
generateSitemapDataAndActivateSchedule();

// enable retrieval of version history data from a specified date-time
hookLibsWithTimeTravel();

// start task for handling caching of expired and prepublished content
if (clusterLib.isMaster()) {
    // make sure the lock is released on startup
    invalidator.releaseInvalidatorLock();

    // make sure the updateAll lock is released on startup, and clear the
    // list of recently validated nodes
    const facetValidation = facetLib.getFacetValidation();
    if (facetValidation) {
        facetLib.clearUpdateState();
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
