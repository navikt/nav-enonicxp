import * as nodeLib from '/lib/xp/node';
import { RepoBranch } from '../../../types/common';
import { getLayersData } from '../layers-data';
import { logger } from '../../utils/logging';

export const getLayersMultiConnection = (branch: RepoBranch) => {
    const sources = getLayersData().sources[branch];

    logger.info(`Sources for branch ${branch}: ${JSON.stringify(sources)}`);

    return nodeLib.multiRepoConnect({
        sources,
    });
};
