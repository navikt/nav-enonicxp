import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import { getSearchConfig, refreshSearchConfigCache } from './config';
import { logger } from '../utils/logging';
import { contentRepo } from '../constants';
import { updateFacetsForContent } from './contentUpdateHandler';
import { updateAllFacets } from './configUpdateHandler';

let isActive = false;

export const activateSearchIndexEventHandlers = () => {
    if (isActive) {
        logger.error(
            `Attempted to activate search index event handlers, but handlers were already active!`
        );
        return;
    }

    const facetsConfig = getSearchConfig();
    if (!facetsConfig) {
        logger.critical(`No facets config found!`);
        return;
    }

    const facetsConfigId = facetsConfig._id;

    eventLib.listener({
        type: 'node.pushed',
        callback: (event) => {
            if (!clusterLib.isMaster()) {
                return;
            }

            event.data.nodes.forEach((nodeData) => {
                if (nodeData.repo !== contentRepo || nodeData.branch !== 'master') {
                    return;
                }

                if (nodeData.id === facetsConfigId) {
                    refreshSearchConfigCache();
                    updateAllFacets();
                    return;
                }

                updateFacetsForContent(nodeData.id);
            });
        },
        localOnly: false,
    });

    isActive = true;

    logger.info('Started event listener for facets updates');
};
