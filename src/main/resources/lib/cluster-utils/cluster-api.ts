import httpClient from '/lib/http-client';
import { logger } from '../utils/logging';

type LocalNodeInfo = {
    isMaster: boolean;
    id: string;
    hostName: string;
    version: string;
    numberOfNodesSeen: number;
};

export type ClusterNodeInfo = {
    isMaster: boolean;
    id: string;
    hostName: string;
    version: string;
    address: string;
    name: string;
    isDataNode: boolean;
    isClientNode: boolean;
};

export type ClusterState = 'RED' | 'YELLOW' | 'GREEN';

export type ClusterInfo = {
    name: string;
    localNode: LocalNodeInfo;
    members: ClusterNodeInfo[];
    state: ClusterState;
};

const clusterStatisticsApi = 'http://localhost:2609/cluster.elasticsearch';

export const requestClusterInfo = () => {
    try {
        const response = httpClient.request({
            url: clusterStatisticsApi,
        });

        if (response.status !== 200 || !response.body) {
            logger.error(`Failed to get cluster info - ${response.message}`);
            return null;
        }

        return JSON.parse(response.body) as ClusterInfo;
    } catch (e) {
        logger.error(`Failed to get cluster info - ${e}`);
        return null;
    }
};

const getLocalServerName = (clusterInfo: ClusterInfo) => {
    const localMember = clusterInfo.members.find(
        (member) => member.id === clusterInfo.localNode.id
    );

    return localMember?.name || clusterInfo.localNode.id;
};

export const clusterInfo: {
    localServerName: string;
    nodeCount: number;
} = {
    localServerName: '',
    nodeCount: 0,
};

export const updateClusterInfo = () => {
    const clusterInfoResponse = requestClusterInfo();
    if (!clusterInfoResponse) {
        return;
    }

    clusterInfo.localServerName = getLocalServerName(clusterInfoResponse);
    clusterInfo.nodeCount = clusterInfoResponse.members.length;

    logger.info(
        `Local server name: ${clusterInfo.localServerName} - Nodes in cluster: ${clusterInfo.nodeCount}`
    );
};
