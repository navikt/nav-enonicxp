import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import * as taskLib from '/lib/xp/task';
import { logger } from '../../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../../constants';
import { getLayersData } from '../../localization/layers-data';
import { getExternalSearchConfig, revalidateExternalSearchConfigCache } from './config';
import { updateExternalSearchDocumentForContent } from './create-or-update-document';

let isActive = false;

const runSearchDocumentUpdateTask = (contentId: string, repoId: string) => {
    taskLib.executeFunction({
        description: `Update external search index for ${contentId} in ${repoId}`,
        func: () => {
            try {
                updateExternalSearchDocumentForContent(contentId, repoId);
            } catch (e) {
                logger.critical(
                    `Error while running search index update for ${contentId} in ${repoId} - ${e}`
                );
            }
        },
    });
};

export const activateExternalSearchIndexEventHandlers = () => {
    if (isActive) {
        logger.error(
            `Attempted to activate search index event handlers, but handlers were already active!`
        );
        return;
    }

    isActive = true;

    revalidateExternalSearchConfigCache();

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        callback: (event) => {
            if (!clusterLib.isMaster()) {
                return;
            }

            const searchConfig = getExternalSearchConfig();
            if (!searchConfig) {
                logger.critical(`No search config found - could not run event handler!`);
                return;
            }

            event.data.nodes.forEach((nodeData) => {
                if (nodeData.branch !== 'master' || !nodeData.path.startsWith('/content/')) {
                    return;
                }

                if (nodeData.repo === CONTENT_ROOT_REPO_ID && nodeData.id === searchConfig._id) {
                    revalidateExternalSearchConfigCache();
                    return;
                }

                const { repoIdToLocaleMap } = getLayersData();

                // Only nodes from a content repo should be indexed
                if (!repoIdToLocaleMap[nodeData.repo]) {
                    return;
                }

                runSearchDocumentUpdateTask(nodeData.id, nodeData.repo);
            });
        },
        localOnly: false,
    });

    logger.info('Started event listener for search index updates');
};
