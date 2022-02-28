log.info('Started running main');

require('/lib/polyfills');

const { hookLibsWithTimeTravel } = require('/lib/time-travel/run-with-time-travel');
const facetLib = require('/lib/facets');

import clusterLib from '/lib/xp/cluster';
import { startOfficeInfoPeriodicUpdateSchedule } from './lib/officeInformation';
import { activateCacheEventListeners } from './lib/cache-invalidate/cache-invalidate';
import {
    activateSitemapDataUpdateEventListener,
    generateSitemapDataAndActivateSchedule,
} from './lib/sitemap/sitemap';
import {
    addReliableEventListener,
    startReliableEventAckListener,
} from './lib/events/reliable-custom-events';
import { updateClusterInfo } from './lib/cluster/cluster-utils';

updateClusterInfo();

startReliableEventAckListener();

// TODO: remove this after verifying it works in prod :)
addReliableEventListener({
    type: 'test-event',
    callback: (event) => {
        log.info(`Event received! ${event.type} - ${event.data.eventId}`);
    },
});

startOfficeInfoPeriodicUpdateSchedule();

activateCacheEventListeners();

activateSitemapDataUpdateEventListener();

generateSitemapDataAndActivateSchedule();

hookLibsWithTimeTravel();

// if (clusterLib.isMaster()) {
//     // make sure the updateAll lock is released on startup, and clear the
//     // list of recently validated nodes
//     const facetValidation = facetLib.getFacetValidation();
//     if (facetValidation) {
//         facetLib.clearUpdateState();
//     }
// }
//
// facetLib.activateEventListener();

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
