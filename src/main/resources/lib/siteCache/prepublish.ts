import schedulerLib from '/lib/xp/scheduler';
import { EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
import clusterLib from '/lib/xp/cluster';
import { runInBranchContext } from '../utils/branch-context';
import { NodeEventData } from './index';
import { RepoBranch } from '../../types/common';
import { appDescriptor } from '../constants';
import { PrepublishCacheWipeConfig } from '../../tasks/prepublish-cache-wipe/prepublish-cache-wipe-config';

const getPublishFrom = (node: NodeEventData) => {
    const repo = nodeLib.connect({
        repoId: node.repo,
        branch: node.branch as RepoBranch,
    });

    const content = repo.get({ key: node.id });

    if (!content?.publish?.from) {
        log.error('Content has no publish.from date!');
        return false;
    }

    return content.publish.from;
};

const isPrepublished = (publishFrom: string) => {
    return new Date(publishFrom).getTime() > Date.now();
};

const scheduleCacheInvalidation = (
    nodeData: NodeEventData,
    event: EnonicEvent,
    publishFrom: string
) =>
    runInBranchContext(() => {
        const jobName = `schedule-${nodeData.id}`;
        const taskConfig = {
            path: nodeData.path,
            id: nodeData.id,
            timestamp: event.timestamp,
            eventType: event.type,
        };

        const existingJob = schedulerLib.get({ name: jobName });

        if (existingJob) {
            log.info(`Job modified: ${jobName}`);
            return schedulerLib.modify<PrepublishCacheWipeConfig>({
                name: jobName,
                editor: (prevJob) => {
                    prevJob.config = taskConfig;
                    prevJob.schedule.value = publishFrom;
                    return prevJob;
                },
            });
        } else {
            log.info(`Job created: ${jobName}`);
            return schedulerLib.create<PrepublishCacheWipeConfig>({
                name: jobName,
                descriptor: `${appDescriptor}:prepublish-cache-wipe`,
                schedule: {
                    type: 'ONE_TIME',
                    value: publishFrom,
                },
                enabled: true,
                user: 'user:system:su',
                config: taskConfig,
            });
        }
    }, 'master');

export const scheduleInvalidateIfPrepublish = (nodeData: NodeEventData, event: EnonicEvent) => {
    if (event.type !== 'node.pushed') {
        return false;
    }

    const publishFrom = getPublishFrom(nodeData);

    if (!publishFrom) {
        return false;
    }

    if (!isPrepublished(publishFrom)) {
        return false;
    }

    if (clusterLib.isMaster()) {
        scheduleCacheInvalidation(nodeData, event, publishFrom);
        log.info(`Prepublish cache invalidation scheduled for ${nodeData.id} at ${publishFrom}`);
    }

    return true;
};
