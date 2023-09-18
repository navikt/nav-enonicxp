log.info('Started running main');

import './lib/polyfills';

import * as clusterLib from '/lib/xp/cluster';
import { activateCacheEventListeners } from './lib/cache/invalidate-event-handlers';
import {
    activateSitemapDataUpdateEventListener,
    generateSitemapDataAndActivateSchedule,
} from './lib/sitemap/sitemap';
import { updateClusterInfo } from './lib/utils/cluster-utils';
import { startOfficeInfoPeriodicUpdateSchedule } from './lib/officeInformation';
import { activateContentListItemUnpublishedListener } from './lib/contentlists/remove-unpublished';
import { startFailsafeSchedule } from './lib/scheduling/scheduler-failsafe';
import { activateCustomPathNodeListeners } from './lib/paths/custom-paths/custom-path-event-listeners';
import { createOfficeBranchFetchSchedule } from 'lib/officeBranch';
import { activateSearchIndexEventHandlers } from './lib/search/search-event-handlers';
import { hookLibsWithTimeTravel } from './lib/time-travel/time-travel-hooks';
import { initSearchRepo } from './lib/search/search-repo';
import { initLayersData } from './lib/localization/layers-data';
import { activateLayersEventListeners } from './lib/localization/publish-events';
import { activateContentUpdateListener } from './lib/contentUpdate/content-update-listener';

updateClusterInfo();
initLayersData();

activateLayersEventListeners();
// activateCacheEventListeners();
// activateSitemapDataUpdateEventListener();
// activateContentListItemUnpublishedListener();
// activateCustomPathNodeListeners();
// activateSearchIndexEventHandlers();
// activateContentUpdateListener();

hookLibsWithTimeTravel();

if (clusterLib.isMaster()) {
    log.info('Running master only init scripts');
    initSearchRepo();
    startFailsafeSchedule();
    startOfficeInfoPeriodicUpdateSchedule();
    createOfficeBranchFetchSchedule();

    // This is somewhat annoying for local development, as it will run a fairly heavy task and spam
    // the logs when generating the sitemap. This happens on every redeploy of the app.
    if (app.config.env !== 'localhost') {
        generateSitemapDataAndActivateSchedule();
    }
}

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
