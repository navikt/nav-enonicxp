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
import { TIME_TRAVEL_ENABLED } from './lib/time-travel/run-with-time-travel';
import { initMiscRepo } from './lib/repos/misc-repo';
import { initLayersData } from './lib/localization/layers-data';
import { activateLayersEventListeners } from './lib/localization/publish-events';
import { activateContentUpdateListener } from './lib/contentUpdate/content-update-listener';
import { activateExternalSearchIndexEventHandlers } from './lib/search/event-handlers';
import { initializeMainDatanodeSelection } from './lib/cluster-utils/main-datanode';
import { activateSchedulerCleanupSchedule } from './lib/scheduling/schedule-cleanup';
import { initArchiveContentTrees } from './lib/external-archive/content-tree-archive';
import { activateArchiveNewsSchedule } from './lib/archiving/archive-old-news';
import { runInContext } from './lib/context/run-in-context';
import { CONTENT_ROOT_REPO_ID } from './lib/constants';

// XP8 runs the main controller without a repository/branch and as an unknown user, which is denied
// content access. XP7 defaulted to the root content repo and draft branch, which much of the init
// code implicitly relies on.
runInContext({ repository: CONTENT_ROOT_REPO_ID, branch: 'draft', asAdmin: true }, () => {
    updateClusterInfo();
    initLayersData();
    if (TIME_TRAVEL_ENABLED) {
        hookLibsWithTimeTravel();
    }

    if (clusterLib.isMaster()) {
        log.info('Running master only init scripts');
        initializeMainDatanodeSelection();
        initMiscRepo();
    }

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
});

log.info('Finished running main');

__.disposer(() => {
    log.info('App is shutting down');
});
