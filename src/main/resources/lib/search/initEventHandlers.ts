import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import { getSearchConfig, revalidateSearchConfigCache } from './config';
import { logger } from '../utils/logging';
import { contentRepo } from '../constants';
import { updateSearchNode } from './onContentUpdate';
import { revalidateAllSearchNodes } from './onConfigUpdate';
import { deleteSearchNodesForContent } from './utils';

let isActive = false;

export const activateSearchIndexEventHandlers = () => {
    if (isActive) {
        logger.error(
            `Attempted to activate search index event handlers, but handlers were already active!`
        );
        return;
    }

    isActive = true;

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
                    revalidateSearchConfigCache();
                    revalidateAllSearchNodes();
                    return;
                }

                if (event.type === 'node.deleted') {
                    deleteSearchNodesForContent(nodeData.id);
                } else {
                    updateSearchNode(nodeData.id);
                }
            });
        },
        localOnly: false,
    });

    logger.info('Started event listener for search index updates');
};
