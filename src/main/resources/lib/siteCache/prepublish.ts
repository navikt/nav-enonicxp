import schedulerLib from '/lib/xp/scheduler';
import { EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
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

    const jobName = `schedule-${nodeData.id}`;

    const existingJob = schedulerLib.get({ name: jobName });

    if (existingJob) {
        const job = runInBranchContext(
            () =>
                schedulerLib.modify<PrepublishCacheWipeConfig>({
                    name: jobName,
                    editor: (prevJob) => {
                        return prevJob;
                    },
                }),
            'master'
        );
        log.info(`Job modified: ${JSON.stringify(job)}`);
    } else {
        const job = runInBranchContext(
            () =>
                schedulerLib.create<PrepublishCacheWipeConfig>({
                    name: jobName,
                    descriptor: `${appDescriptor}:prepublish-cache-wipe`,
                    schedule: {
                        type: 'ONE_TIME',
                        value: publishFrom,
                    },
                    enabled: true,
                    user: 'user:system:su',
                    config: {
                        path: nodeData.path,
                        id: nodeData.id,
                        timestamp: event.timestamp,
                        eventType: event.type,
                    },
                }),
            'master'
        );
        log.info(`Job created: ${JSON.stringify(job)}`);
    }

    return true;
};
