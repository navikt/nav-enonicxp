import { EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
import { NodeEventData } from './index';
import { RepoBranch } from '../../types/common';
import { appDescriptor } from '../constants';
import { createOrUpdateSchedule } from '../utils/scheduler';

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
) => {
    createOrUpdateSchedule({
        jobName: `schedule-invalidate-${nodeData.id}`,
        jobSchedule: {
            type: 'ONE_TIME',
            value: publishFrom,
        },
        taskDescriptor: `${appDescriptor}:prepublish-cache-wipe`,
        taskConfig: {
            path: nodeData.path,
            id: nodeData.id,
            timestamp: event.timestamp,
            eventType: event.type,
        },
    });
};

export const scheduleInvalidateIfPrepublish = (nodeData: NodeEventData, event: EnonicEvent) => {
    if (event.type !== 'node.pushed') {
        return false;
    }

    const publishFrom = getPublishFrom(nodeData);

    if (!publishFrom || !isPrepublished(publishFrom)) {
        return false;
    }

    scheduleCacheInvalidation(nodeData, event, publishFrom);

    return true;
};
