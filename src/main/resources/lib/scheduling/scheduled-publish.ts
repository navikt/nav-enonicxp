import * as nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { APP_DESCRIPTOR } from '../constants';
import { createOrUpdateSchedule } from './schedule-job';
import { PrepublishCacheWipeConfig } from '../../tasks/prepublish-cache-wipe/prepublish-cache-wipe-config';
import { UnpublishExpiredContentConfig } from '../../tasks/unpublish-expired-content/unpublish-expired-content-config';
import { NodeEventData } from '../cache/utils';
import { getUnixTimeFromDateTimeString } from '../utils/nav-utils';
import { logger } from '../utils/logging';

const getPublish = (node: NodeEventData) => {
    const repo = nodeLib.connect({
        repoId: node.repo,
        branch: 'master',
    });

    const content = repo.get<Content>({ key: node.id });

    if (!content) {
        logger.error(`Content for ${node.id} not found in repo ${node.repo}!`);
        return null;
    }

    if (!content.publish) {
        logger.error(`No publish object found for content ${node.id} in repo ${node.repo}!`);
        return null;
    }

    return content.publish;
};

export const isPrepublished = (publishFrom?: string): publishFrom is string => {
    return publishFrom ? getUnixTimeFromDateTimeString(publishFrom) > Date.now() : false;
};

export const getPrepublishJobName = (contentId: string) => `prepublish-invalidate-${contentId}`;

export const getUnpublishJobName = (contentId: string) => `unpublish-${contentId}`;

export const scheduleCacheInvalidation = ({
    id,
    path,
    repoId,
    publishFrom,
}: {
    id: string;
    path: string;
    repoId: string;
    publishFrom: string;
}) => {
    createOrUpdateSchedule<PrepublishCacheWipeConfig>({
        jobName: getPrepublishJobName(id),
        jobSchedule: {
            type: 'ONE_TIME',
            value: publishFrom,
        },
        taskDescriptor: `${APP_DESCRIPTOR}:prepublish-cache-wipe`,
        taskConfig: {
            path,
            id,
            repoId,
        },
    });
};

export const scheduleUnpublish = ({
    id,
    path,
    repoId,
    publishTo,
}: {
    id: string;
    path: string;
    repoId: string;
    publishTo: string;
}) => {
    createOrUpdateSchedule<UnpublishExpiredContentConfig>({
        jobName: getUnpublishJobName(id),
        jobSchedule: {
            type: 'ONE_TIME',
            value: publishTo,
        },
        taskDescriptor: `${APP_DESCRIPTOR}:unpublish-expired-content`,
        taskConfig: {
            path,
            id,
            repoId,
        },
    });
};

// Returns true if the content was scheduled for prepublishing
export const handleScheduledPublish = (nodeData: NodeEventData, eventType: string) => {
    if (eventType !== 'node.pushed') {
        return false;
    }

    const publish = getPublish(nodeData);

    if (!publish) {
        return false;
    }

    const { id, path, repo } = nodeData;

    if (publish.to) {
        scheduleUnpublish({ id, path, repoId: repo, publishTo: publish.to });
    }

    if (isPrepublished(publish.from)) {
        scheduleCacheInvalidation({
            id,
            path,
            repoId: repo,
            publishFrom: publish.from,
        });
        return true;
    }

    return false;
};
