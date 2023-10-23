import * as nodeLib from '/lib/xp/node';
import { RepoBranch } from '../../../types/common';
import { getLayersData } from '../layers-data';

export const getLayersMultiConnection = (branch: RepoBranch) => {
    return nodeLib.multiRepoConnect({
        sources: getLayersData().sources[branch],
    });
};
