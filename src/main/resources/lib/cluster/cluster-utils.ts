import httpClient from '/lib/http-client';

type LocalNodeInfo = {
    isMaster: boolean;
    id: string;
    hostName: string;
    version: string;
    numberOfNodesSeen: number;
};

type ClusterNodeInfo = {
    isMaster: boolean;
    id: string;
    hostName: string;
    version: string;
    address: string;
    name: string;
    isDataNode: boolean;
    isClientNode: boolean;
};

type ClusterState = 'RED' | 'YELLOW' | 'GREEN';

type ClusterInfo = {
    name: string;
    localNode: LocalNodeInfo;
    members: ClusterNodeInfo[];
    state: ClusterState;
};

const clusterManagementApi = 'http://localhost:2609/cluster.elasticsearch';

const requestClusterInfo = () => {
    try {
        const response = httpClient.request({
            url: clusterManagementApi,
        });

        if (response.status !== 200 || !response.body) {
            log.error(`Failed to get cluster info - ${response.message}`);
            return null;
        }

        return JSON.parse(response.body) as ClusterInfo;
    } catch (e) {
        log.error(`Failed to get cluster info - ${e}`);
        return null;
    }
};

export const clusterInfo: { localServerName?: string; nodeCount?: number } = {};

export const updateClusterInfo = () => {
    const clusterInfoResponse = requestClusterInfo();
    if (!clusterInfoResponse) {
        return null;
    }

    const localId = clusterInfoResponse.localNode.id;
    const localMember = clusterInfoResponse.members.find((member) => member.id === localId);

    clusterInfo.localServerName = localMember?.name;
    clusterInfo.nodeCount = clusterInfoResponse.members.length;
};
