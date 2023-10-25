import * as gridLib from '/lib/xp/grid';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { clusterInfo, ClusterInfo, ClusterNodeInfo, requestClusterInfo } from './cluster-api';
import { logger } from '../utils/logging';
import { APP_DESCRIPTOR } from '../constants';

const SHARED_MAP_KEY = 'main-datanode';

const CURRENT_MAIN_DATANODE_KEY = 'current-node';

const pickDatanode = (clusterInfo: ClusterInfo): ClusterNodeInfo | null => {
    const datanode = clusterInfo.members.find((member) => member.isDataNode);
    if (!datanode) {
        logger.critical('No data nodes found!');
        return null;
    }

    return datanode;
};

const isNodeInCluster = (clusterInfo: ClusterInfo, node: ClusterNodeInfo | null): boolean => {
    if (!node) {
        return false;
    }

    return !!clusterInfo.members.find((member) => member.name === node.name);
};

const getSharedMap = () => {
    const sharedMap = gridLib.getMap(SHARED_MAP_KEY);
    if (!sharedMap) {
        logger.critical(`Shared map with key ${SHARED_MAP_KEY} is not available!`);
        return null;
    }

    return sharedMap;
};

const getCurrentMainDatanode = (sharedMap = getSharedMap()) => {
    if (!sharedMap) {
        return null;
    }

    return sharedMap.get<ClusterNodeInfo>(CURRENT_MAIN_DATANODE_KEY);
};

export const refreshMainDatanode = () => {
    logger.info('Refreshing main datanode');

    const clusterInfo = requestClusterInfo();
    if (!clusterInfo) {
        logger.critical('Failed to get cluster info!');
        return;
    }

    const sharedMap = getSharedMap();
    if (!sharedMap) {
        return;
    }

    const currentMainDatanode = getCurrentMainDatanode(sharedMap);

    if (isNodeInCluster(clusterInfo, currentMainDatanode)) {
        logger.info(
            `Current main data node ${currentMainDatanode} is still valid, no action needed`
        );
        return;
    }

    const newMainDatanode = pickDatanode(clusterInfo);

    sharedMap.set({
        key: CURRENT_MAIN_DATANODE_KEY,
        ttlSeconds: 0,
        value: newMainDatanode,
    });
};

export const isMainDatanode = () => {
    const currentMainDatanode = getCurrentMainDatanode();
    logger.info(`Current main data node: ${currentMainDatanode}`);

    return currentMainDatanode?.name === clusterInfo.localServerName;
};

export const initializeMainDatanodeSelection = () => {
    refreshMainDatanode();

    createOrUpdateSchedule({
        jobName: 'refresh-main-datanode',
        jobSchedule: {
            type: 'CRON',
            value: '* * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: `${APP_DESCRIPTOR}:refresh-main-datanode`,
        taskConfig: {},
    });
};
