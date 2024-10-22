/// <reference path="types/global.d.ts" />
log.info('Started running main');

import './lib/polyfills';

import * as clusterLib from '/lib/xp/cluster';
import { activateCacheEventListeners } from './lib/cache/invalidate-event-handlers';
import {
    activateSitemapDataUpdateEventListener,
    generateSitemapDataAndActivateSchedule,
} from './lib/sitemap/sitemap';
import { updateClusterInfo } from './lib/cluster-utils/cluster-api';
import { startOfficeInfoPeriodicUpdateSchedule } from './lib/office-pages/_legacy-office-information/legacy-office-update';
import { activateContentListItemUnpublishedListener } from './lib/contentlists/remove-unpublished';
import { activateCustomPathNodeListeners } from './lib/paths/custom-paths/custom-path-event-listeners';
import { createOfficeFetchSchedule } from './lib/office-pages/office-tasks';
import { hookLibsWithTimeTravel } from './lib/time-travel/time-travel-hooks';
import { initMiscRepo } from './lib/repos/misc-repo';
import { initLayersData } from './lib/localization/layers-data';
import { activateLayersEventListeners } from './lib/localization/publish-events';
import { activateContentUpdateListener } from './lib/contentUpdate/content-update-listener';
import { activateExternalSearchIndexEventHandlers } from './lib/search/event-handlers';
import { initializeMainDatanodeSelection } from './lib/cluster-utils/main-datanode';
import { activateSchedulerCleanupSchedule } from './lib/scheduling/schedule-cleanup';
import { activateArchiveNewsSchedule } from './lib/archiving/archive-old-news';

updateClusterInfo();
initLayersData();
hookLibsWithTimeTravel();

if (clusterLib.isMaster()) {
    log.info('Running master only init scripts');
    initializeMainDatanodeSelection();
    initMiscRepo();
}

if (app.config.env !== 'test') {
    createOfficeFetchSchedule();
    startOfficeInfoPeriodicUpdateSchedule();
    activateSitemapDataUpdateEventListener();
}

activateLayersEventListeners();
// TODO: reactivate these after running the big archive job
// activateCacheEventListeners();
// activateContentListItemUnpublishedListener();
// activateExternalSearchIndexEventHandlers();
// activateArchiveNewsSchedule()
activateCustomPathNodeListeners();
activateContentUpdateListener();
activateSchedulerCleanupSchedule();

// This is somewhat annoying for local development, as it will run a fairly heavy task and spam
// the logs when generating the sitemap. This happens on every redeploy of the app.
if (app.config.env !== 'localhost' && app.config.env !== 'test') {
    generateSitemapDataAndActivateSchedule();
}

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
