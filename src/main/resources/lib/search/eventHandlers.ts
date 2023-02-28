import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import * as taskLib from '/lib/xp/task';
import { getSearchConfig, revalidateSearchConfigCache } from './config';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { updateSearchNode } from './onContentUpdate';
import { revalidateAllSearchNodes, revalidateAllSearchNodesAbort } from './onConfigUpdate';
import {
    clearSearchNodeUpdateQueue,
    getUpdateQueue,
    queueUpdateAll,
    queueUpdateForContent,
} from './repo';
import { forceArray } from '../utils/nav-utils';
import { getLayersData } from '../localization/layers-data';

let isActive = false;
let isRunningConfigUpdate = false;

export const searchNodesUpdateAbortEvent = 'abortSearchNodeUpdates';

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
    } else if (updateState.queuedContentUpdates) {
        const updateQueueEntries = forceArray(updateState.queuedContentUpdates);
        logger.info(
            `Running update search-nodes task from queue for content: ${JSON.stringify(
                updateQueueEntries
            )}`
        );
        updateQueueEntries.forEach(({ contentId, repoId }) =>
            runUpdateSingleContentTask(contentId, repoId)
        );
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
                const updateIsValid = revalidateSearchConfigCache();
                if (updateIsValid) {
                    revalidateAllSearchNodes();
                }
            } catch (e) {
                logger.critical(`Error while running search config updates - ${e}`);
            } finally {
                isRunningConfigUpdate = false;
                runQueuedUpdates();
            }
        },
    });
};

const runUpdateSingleContentTask = (contentId: string, repoId: string) => {
    if (isRunningConfigUpdate) {
        logger.info(
            `Attempted to update content while running update-all job - Queuing ${contentId} for later update`
        );
        queueUpdateForContent(contentId, repoId);
        return;
    }

    taskLib.executeFunction({
        description: `Update search node for ${contentId}`,
        func: () => {
            try {
                updateSearchNode(contentId, repoId);
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
                if (nodeData.branch !== 'master') {
                    return;
                }

                if (nodeData.repo === CONTENT_ROOT_REPO_ID && nodeData.id === searchConfig._id) {
                    runUpdateAllTask();
                    return;
                }

                const { repoIdToLocaleMap } = getLayersData();

                // Only nodes from a content repo should be indexed
                if (!repoIdToLocaleMap[nodeData.repo]) {
                    return;
                }

                runUpdateSingleContentTask(nodeData.id, nodeData.repo);
            });
        },
        localOnly: false,
    });

    eventLib.listener({
        type: `custom.${searchNodesUpdateAbortEvent}`,
        callback: () => {
            revalidateAllSearchNodesAbort();
        },
        localOnly: false,
    });

    logger.info('Started event listener for search index updates');
};
