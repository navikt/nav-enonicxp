import contextLib from '/lib/xp/context';
import { RepoConnection } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { getNodeKey, getTargetUnixTime } from './version-utils';
import { getUnixTimeFromDateTimeString } from '../utils/nav-utils';
import { nodeLibConnectStandard } from './run-with-time-travel';

type ConfigEntry = {
    repo: RepoConnection;
    branch: RepoBranch;
    baseNodeKey: string;
    baseContentKey: string;
    targetUnixTime: number;
};

type ConfigMap = {
    configs: { [threadId: string]: ConfigEntry };
    add: ({
        threadId,
        requestedDateTime,
        branch,
        baseContentKey,
    }: {
        threadId: number;
        requestedDateTime: string;
        branch: RepoBranch;
        baseContentKey: string;
    }) => void;
    get: (threadId: number) => ConfigEntry | undefined;
    remove: (threadId: number) => void;
    clear: () => void;
};

// Stores config-objects for time travel for threads that requested content from
// a certain timestamp. Keyed with thread-id. Any thread with an entry in this map
// will retrieve all content from the specified timestamp.
export const timeTravelConfigMap: ConfigMap = {
    configs: {},
    add: function ({ threadId, requestedDateTime, branch = 'master', baseContentKey }) {
        const context = contextLib.get();
        const repo = nodeLibConnectStandard({
            repoId: context.repository,
            branch: branch,
        });

        const baseNodeKey = getNodeKey(baseContentKey);
        const requestedUnixTime = getUnixTimeFromDateTimeString(requestedDateTime);

        const targetUnixTime = getTargetUnixTime({
            nodeKey: baseNodeKey,
            requestedUnixTime,
            repo,
            branch,
        });

        log.info(`Adding time travel config for thread ${threadId}`);

        this.configs[threadId] = {
            repo,
            branch,
            baseNodeKey,
            baseContentKey,
            targetUnixTime,
        };
    },
    get: function (threadId) {
        const config = this.configs[threadId];

        // Check for 'undefined' to account for a rare/strange nashorn behaviour where a deleted object
        // entry sometimes returns an object of the Undefined Java class, which evalutes to true
        if (config?.toString() === 'undefined') {
            log.error(`Time travel config returned an unexpected object for thread ${threadId}`);
            return undefined;
        }

        return this.configs[threadId];
    },
    remove: function (threadId) {
        delete this.configs[threadId];
    },
    clear: function () {
        this.configs = {};
    },
};
