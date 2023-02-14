log.info('Started running main');

import './lib/polyfills';

import * as clusterLib from '/lib/xp/cluster';
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
import { activateSearchIndexEventHandlers } from './lib/search/eventHandlers';
import { hookLibsWithTimeTravel } from './lib/time-travel/time-travel-hooks';
import { timeTravelConfig } from './lib/time-travel/time-travel-config';
import { initSearchRepo } from './lib/search/repo';
import { initLayersData } from './lib/localization/layers-data';

updateClusterInfo();
initLayersData();

startReliableEventAckListener();
activateCacheEventListeners();
activateSitemapDataUpdateEventListener();
activateContentListItemUnpublishedListener();
activateCustomPathNodeListeners();

hookLibsWithTimeTravel(timeTravelConfig);

if (clusterLib.isMaster()) {
    log.info('Running master only init scripts');
    initSearchRepo();
    startFailsafeSchedule();
    generateSitemapDataAndActivateSchedule();
    startOfficeInfoPeriodicUpdateSchedule();
    // Todo: Activate this only when we're going live with the new office branch.
    createOfficeBranchFetchSchedule();
}

activateSearchIndexEventHandlers();

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
