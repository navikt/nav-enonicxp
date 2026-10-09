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
import { activateContentListItemUnpublishedListener } from './lib/contentlists/remove-unpublished';
import { activateCustomPathNodeListeners } from './lib/paths/custom-paths/custom-path-event-listeners';
import { createOfficeImportSchedule } from './lib/office-pages/office-tasks';
import { hookLibsWithTimeTravel } from './lib/time-travel/time-travel-hooks';
import { initMiscRepo } from './lib/repos/misc-repo';
import { initLayersData } from './lib/localization/layers-data';
import { activateLayersEventListeners } from './lib/localization/publish-events';
import { activateContentUpdateListener } from './lib/contentUpdate/content-update-listener';
import { activateExternalSearchIndexEventHandlers } from './lib/search/event-handlers';
import { initializeMainDatanodeSelection } from './lib/cluster-utils/main-datanode';
import { activateSchedulerCleanupSchedule } from './lib/scheduling/schedule-cleanup';
import { initArchiveContentTrees } from './lib/external-archive/content-tree-archive';
import { activateArchiveNewsSchedule } from './lib/archiving/archive-old-news';
import { isCuratedImportInProgress } from './lib/curated-export/safety';

updateClusterInfo();
initLayersData();
hookLibsWithTimeTravel();

if (clusterLib.isMaster()) {
    log.info('Running master only init scripts');
    initializeMainDatanodeSelection();
    initMiscRepo();
}

// Native imports emit normal node events. Editing those nodes here would corrupt
// the source snapshot (for example, custom-path cleanup drops typed null values).
if (isCuratedImportInProgress()) {
    log.warning(
        'Curated import mode is active: content event listeners are disabled, schedules are not created and content-writing scheduled tasks are skipped. Remove curatedImportInProgress from no.nav.navno.cfg if no import is running.'
    );
} else {
    if (app.config.env !== 'test') {
        createOfficeImportSchedule();
        activateSitemapDataUpdateEventListener();
    }

    activateLayersEventListeners();
    activateCacheEventListeners();
    activateContentListItemUnpublishedListener();
    activateExternalSearchIndexEventHandlers();

    activateArchiveNewsSchedule();

    activateCustomPathNodeListeners();
    activateContentUpdateListener();
    activateSchedulerCleanupSchedule();
    initArchiveContentTrees();

    // This is somewhat annoying for local development, as it will run a fairly heavy task and spam
    // the logs when generating the sitemap. This happens on every redeploy of the app.
    if (app.config.env !== 'localhost' && app.config.env !== 'test') {
        generateSitemapDataAndActivateSchedule();
    }
}

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
