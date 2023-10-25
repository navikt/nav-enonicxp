import * as gridLib from '/lib/xp/grid';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { ClusterInfo, ClusterNodeInfo, requestClusterInfo } from './cluster-api';
import { logger } from '../utils/logging';
import { APP_DESCRIPTOR } from '../constants';

const SHARED_MAP_KEY = 'main-datanode';

const MAIN_DATANODE_NAME_KEY = 'datanode-name';

const pickDatanode = (clusterInfo: ClusterInfo): ClusterNodeInfo | null => {
    const datanode = clusterInfo.members.find((member) => member.isDataNode);
    if (!datanode) {
        logger.critical('No data nodes found!');
        return null;
    }

    return datanode;
};

const isNodeInCluster = (clusterInfo: ClusterInfo, nodeName?: string): boolean => {
    if (!nodeName) {
        return false;
    }

    return !!clusterInfo.members.find((member) => member.name === nodeName);
};

export const refreshMainDatanode = () => {
    const clusterInfo = requestClusterInfo();
    if (!clusterInfo) {
        logger.critical('Failed to get cluster info!');
        return;
    }

    const sharedMap = gridLib.getMap(SHARED_MAP_KEY);
    if (!sharedMap) {
        logger.critical(`Shared map with key ${SHARED_MAP_KEY} is not available!`);
        return;
    }

    const currentMainDatanode = sharedMap.get<string>(MAIN_DATANODE_NAME_KEY);
    if (isNodeInCluster(clusterInfo, currentMainDatanode)) {
        logger.info(
            `Current main data node ${currentMainDatanode} is still valid, no action needed`
        );
        return;
    }

    const newMainDatanode = pickDatanode(clusterInfo);

    sharedMap.set({
        key: MAIN_DATANODE_NAME_KEY,
        ttlSeconds: 0,
        value: newMainDatanode,
    });
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
