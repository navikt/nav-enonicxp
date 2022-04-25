import contextLib from '/lib/xp/context';
import { getNodeKey, getTargetUnixTime } from './version-utils';
import { getUnixTimeFromDateTimeString } from '../utils/nav-utils';
import { nodeLibConnectStandard } from './time-travel-hooks';
import { TimeTravelConfig } from './types';

// Stores config-objects for time travel for threads that requested content from
// a certain timestamp. Keyed with thread-id. Any thread with an entry in this map
// will retrieve all content from the specified timestamp.
export const timeTravelConfig: TimeTravelConfig = {
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
