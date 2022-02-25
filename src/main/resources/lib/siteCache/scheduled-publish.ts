import { EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { NodeEventData } from './index';
import { appDescriptor } from '../constants';
import { createOrUpdateSchedule } from '../utils/scheduler';

const getPublish = (node: NodeEventData) => {
    const repo = nodeLib.connect({
        repoId: node.repo,
        branch: 'master',
    });

    const content = repo.get<Content>({ key: node.id });

    if (!content) {
        log.error(`Content for ${node.id} not found!`);
        return null;
    }

    if (!content.publish) {
        log.error(`No publish object found for content ${node.id}!`);
        return null;
    }

    return content.publish;
};

const isPrepublished = (publishFrom?: string): publishFrom is string => {
    return publishFrom ? new Date(publishFrom).getTime() > Date.now() : false;
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

export const scheduleUnpublish = ({
    id,
    path,
    publishTo,
}: {
    id: string;
    path: string;
    publishTo: string;
}) => {
    createOrUpdateSchedule({
        jobName: `schedule-unpublish-${id}`,
        jobSchedule: {
            type: 'ONE_TIME',
            value: publishTo,
        },
        taskDescriptor: `${appDescriptor}:unpublish-expired-content`,
        taskConfig: {
            path: path,
            id: id,
        },
    });
};

// Returns true if the content was scheduled for prepublishing
export const handleScheduledPublish = (nodeData: NodeEventData, event: EnonicEvent) => {
    if (event.type !== 'node.pushed') {
        return false;
    }

    const publish = getPublish(nodeData);

    if (!publish) {
        return false;
    }

    if (publish.to) {
        scheduleUnpublish({ id: nodeData.id, path: nodeData.path, publishTo: publish.to });
    }

    if (isPrepublished(publish.from)) {
        scheduleCacheInvalidation(nodeData, event, publish.from);
        return true;
    }

    return false;
};
