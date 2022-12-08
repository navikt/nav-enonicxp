import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import taskLib from '/lib/xp/task';
import { getSearchConfig, revalidateSearchConfigCache } from './config';
import { logger } from '../utils/logging';
import { contentRepo } from '../constants';
import { updateSearchNode } from './onContentUpdate';
import { revalidateAllSearchNodes } from './onConfigUpdate';
import {
    clearSearchNodeUpdateQueue,
    getUpdateQueue,
    queueUpdateAll,
    queueUpdateForContent,
} from './repo';
import { forceArray } from '../utils/nav-utils';

let isActive = false;
let isRunningConfigUpdate = false;

const runQueuedUpdates = () => {
    const updateState = getUpdateQueue();
    if (!updateState) {
        logger.critical('No search node update queue found!');
        return;
    }

    clearSearchNodeUpdateQueue();

    if (updateState.isQueuedUpdateAll) {
        logger.info('Running update all search-nodes task from queue');
        runUpdateAllTask();
    } else if (updateState.queuedContentIdUpdates) {
        const contentIdsToUpdate = forceArray(updateState.queuedContentIdUpdates);
        logger.info(
            `Running update search-nodes task from queue for content: ${JSON.stringify(
                contentIdsToUpdate
            )}`
        );
        contentIdsToUpdate.forEach((contentId) => runUpdateSingleContentTask(contentId));
    }
};

const runUpdateAllTask = () => {
    if (isRunningConfigUpdate) {
        logger.warning(
            'Attempted to run concurrent update-all jobs - Queueing a new update-all job'
        );
        queueUpdateAll();
        return;
    }

    isRunningConfigUpdate = true;

    taskLib.executeFunction({
        description: 'Update all search nodes',
        func: () => {
            logger.info('Started search config update...');

            try {
                revalidateSearchConfigCache();
                revalidateAllSearchNodes();
            } catch (e) {
                logger.critical(`Error while running search config updates - ${e}`);
            } finally {
                isRunningConfigUpdate = false;
                runQueuedUpdates();
            }
        },
    });
};

const runUpdateSingleContentTask = (contentId: string) => {
    if (isRunningConfigUpdate) {
        logger.info(
            `Attempted to update content while running update-all job - Queuing ${contentId} for later update`
        );
        queueUpdateForContent(contentId);
        return;
    }

    taskLib.executeFunction({
        description: `Update search node for ${contentId}`,
        func: () => {
            try {
                updateSearchNode(contentId);
            } catch (e) {
                logger.critical(`Error while running search node update for ${contentId} - ${e}`);
            }
        },
    });
};

export const activateSearchIndexEventHandlers = () => {
    if (isActive) {
        logger.error(
            `Attempted to activate search index event handlers, but handlers were already active!`
        );
        return;
    }

    isActive = true;

    revalidateSearchConfigCache();

    if (clusterLib.isMaster()) {
        runQueuedUpdates();
    }

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        callback: (event) => {
            if (!clusterLib.isMaster()) {
                return;
            }

            const searchConfig = getSearchConfig();
            if (!searchConfig) {
                logger.critical(`No search config found - could not run event handler!`);
                return;
            }

            event.data.nodes.forEach((nodeData) => {
                if (nodeData.repo !== contentRepo || nodeData.branch !== 'master') {
                    return;
                }

                if (nodeData.id === searchConfig._id) {
                    runUpdateAllTask();
                    return;
                }

                runUpdateSingleContentTask(nodeData.id);
            });
        },
        localOnly: false,
    });

    logger.info('Started event listener for search index updates');
};