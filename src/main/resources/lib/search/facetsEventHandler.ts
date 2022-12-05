import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import { getFacetsConfig } from './facetsConfig';
import { logger } from '../utils/logging';
import { contentRepo } from '../constants';
import { updateFacetsForContent } from './facetsUpdate';
import { updateAllFacets } from './facetsUpdateAll';

export const activateFacetsUpdateHandler = () => {
    const facetsConfig = getFacetsConfig();
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

                // if (nodeData.id === facetsConfigId) {
                //     updateAllFacets();
                //     return;
                // }

                updateFacetsForContent(nodeData.id);
            });
        },
        localOnly: false,
    });

    logger.info('Started event listener for facets updates');
};
