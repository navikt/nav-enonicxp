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
import { createOfficeBranchFetchSchedule } from 'lib/officeBranch';
import { activateFacetsUpdateHandler } from './lib/search/facetsEventHandler';
import { hookLibsWithTimeTravel } from './lib/time-travel/time-travel-hooks';
import { timeTravelConfig } from './lib/time-travel/time-travel-config';
import { initSearchRepo } from './lib/search/searchRepo';

updateClusterInfo();

startReliableEventAckListener();
activateCacheEventListeners();
activateSitemapDataUpdateEventListener();
activateContentListItemUnpublishedListener();
activateCustomPathNodeListeners();
activateFacetsUpdateHandler();

hookLibsWithTimeTravel(timeTravelConfig);

if (clusterLib.isMaster()) {
    initSearchRepo();
    startFailsafeSchedule();
    generateSitemapDataAndActivateSchedule();
    startOfficeInfoPeriodicUpdateSchedule();
    // Todo: Activate this only when we're going live with the new office branch.
    createOfficeBranchFetchSchedule();
}

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
