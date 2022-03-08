log.info('Started running main');

import './lib/polyfills';

import clusterLib from '/lib/xp/cluster';
import { startOfficeInfoPeriodicUpdateSchedule } from './lib/officeInformation';
import { activateCacheEventListeners } from './lib/cache-invalidate/cache-invalidate';
import {
    activateSitemapDataUpdateEventListener,
    generateSitemapDataAndActivateSchedule,
} from './lib/sitemap/sitemap';
import { startReliableEventAckListener } from './lib/events/reliable-custom-events';
import { updateClusterInfo } from './lib/cluster/cluster-utils';
import { activateContentListItemUnpublishedListener } from './lib/contentlists/remove-unpublished';
import { startFailsafeSchedule } from './lib/scheduling/scheduler-failsafe';

const { hookLibsWithTimeTravel } = require('/lib/time-travel/run-with-time-travel');
const facetLib = require('/lib/facets');

updateClusterInfo();

startReliableEventAckListener();

activateCacheEventListeners();

activateSitemapDataUpdateEventListener();

activateContentListItemUnpublishedListener();

hookLibsWithTimeTravel();

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

facetLib.activateEventListener();

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
