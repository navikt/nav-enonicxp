import './polyfills';

import clusterLib from '/lib/xp/cluster';
import { updateClusterInfo } from './utils/cluster-utils';
import { startReliableEventAckListener } from './events/reliable-custom-events';
import { activateCacheEventListeners } from './cache/invalidate-event-handlers';
import {
    activateSitemapDataUpdateEventListener,
    generateSitemapDataAndActivateSchedule,
} from './sitemap/sitemap';
import { activateContentListItemUnpublishedListener } from './contentlists/remove-unpublished';
import { activateCustomPathNodeListeners } from './custom-paths/event-listeners';
import { activateSearchIndexEventHandlers } from './search/eventHandlers';
import { hookLibsWithTimeTravel } from './time-travel/time-travel-hooks';
import { timeTravelConfig } from './time-travel/time-travel-config';
import { initSearchRepo } from './search/repo';
import { startFailsafeSchedule } from './scheduling/scheduler-failsafe';
import { startOfficeInfoPeriodicUpdateSchedule } from './officeInformation';
import { createOfficeBranchFetchSchedule } from './officeBranch';

let didInit = false;

export const initApp = () => {
    if (didInit) {
        log.error('initApp should only run once!');
        return;
    }

    didInit = true;

    updateClusterInfo();

    startReliableEventAckListener();
    activateCacheEventListeners();
    activateSitemapDataUpdateEventListener();
    activateContentListItemUnpublishedListener();
    activateCustomPathNodeListeners();
    activateSearchIndexEventHandlers();

    hookLibsWithTimeTravel(timeTravelConfig);

    log.info(`Is master? ${clusterLib.isMaster()}`);

    if (clusterLib.isMaster()) {
        log.info('Running master only init scripts');
        initSearchRepo();
        startFailsafeSchedule();
        generateSitemapDataAndActivateSchedule();
        startOfficeInfoPeriodicUpdateSchedule();
        // Todo: Activate this only when we're going live with the new office branch.
        createOfficeBranchFetchSchedule();
    }
};
