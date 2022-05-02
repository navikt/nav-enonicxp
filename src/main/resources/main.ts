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

import {
    activateDataUpdateEventListener,
    buildProductListAndActivateSchedule,
} from './lib/productList/productList';

import { hookLibsWithTimeTravel } from './lib/time-travel/time-travel-hooks';
import { timeTravelConfig } from './lib/time-travel/time-travel-config';
import {
    activateFacetsEventListener,
    clearFacetUpdateState,
    getFacetValidation,
} from './lib/facets';

updateClusterInfo();

startReliableEventAckListener();
activateCacheEventListeners();
activateSitemapDataUpdateEventListener();
activateContentListItemUnpublishedListener();
activateCustomPathNodeListeners();
activateFacetsEventListener();

activateDataUpdateEventListener();

hookLibsWithTimeTravel(timeTravelConfig);

if (clusterLib.isMaster()) {
    // make sure the updateAll lock is released on startup, and clear the
    // list of recently validated nodes
    const facetValidation = getFacetValidation();
    if (facetValidation) {
        clearFacetUpdateState();
    }

    startFailsafeSchedule();
    generateSitemapDataAndActivateSchedule();
    startOfficeInfoPeriodicUpdateSchedule();
    buildProductListAndActivateSchedule();
}

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
