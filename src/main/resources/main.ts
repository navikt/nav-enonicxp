log.info('Started running main');

import './lib/polyfills';

import clusterLib from '/lib/xp/cluster';
import { startOfficeInfoPeriodicUpdateSchedule } from './lib/officeInformation';
import { activateCacheEventListeners } from './lib/cache/invalidate-event-handlers';
import {
    activateSitemapDataUpdateEventListener,
    generateSitemapDataAndActivateSchedule,
} from './lib/sitemap/sitemap';
import { startReliableEventAckListener } from './lib/events/reliable-custom-events';
import { updateClusterInfo } from './lib/utils/cluster-utils';
import { activateContentListItemUnpublishedListener } from './lib/contentlists/remove-unpublished';
import { startFailsafeSchedule } from './lib/scheduling/scheduler-failsafe';
import { activateCustomPathNodeListeners } from './lib/custom-paths/event-listeners';
import { hookLibsWithTimeTravel } from './lib/time-travel/time-travel-hooks';
import { timeTravelConfig } from './lib/time-travel/time-travel-config';

const facetLib = require('/lib/facets');

updateClusterInfo();

startReliableEventAckListener();
activateCacheEventListeners();
activateSitemapDataUpdateEventListener();
activateContentListItemUnpublishedListener();
activateCustomPathNodeListeners();
facetLib.activateEventListener();

hookLibsWithTimeTravel(timeTravelConfig);

if (clusterLib.isMaster()) {
    // make sure the updateAll lock is released on startup, and clear the
    // list of recently validated nodes
    const facetValidation = facetLib.getFacetValidation();
    if (facetValidation) {
        facetLib.clearUpdateState();
    }

    startFailsafeSchedule();
    generateSitemapDataAndActivateSchedule();
    startOfficeInfoPeriodicUpdateSchedule();
}

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
