import { getRepoConnection } from '../utils/repo-utils';
import { Content } from '/lib/xp/content';
import { APP_DESCRIPTOR } from '../constants';
import { createOrUpdateSchedule } from './schedule-job';
import { NodeEventData } from '../cache/utils';
import { logger } from '../utils/logging';
import { isContentLocalized } from '../localization/locale-utils';
import { PrepublishCacheWipe } from '@xp-types/tasks/prepublish-cache-wipe';
import { UnpublishExpiredContent } from '@xp-types/tasks/unpublish-expired-content';

const getPublish = (node: NodeEventData) => {
    const repo = getRepoConnection({
        repoId: node.repo,
        branch: 'master',
    });

    const content = repo.get<Content>({ key: node.id });
    if (!content) {
        logger.info(`Content for ${node.id} not found in repo ${node.repo}!`);
        return null;
    }

    if (!content.publish || !isContentLocalized(content)) {
        return null;
    }

    return content.publish;
};

export const isPrepublished = (publishFrom?: string): publishFrom is string => {
    return publishFrom ? publishFrom > new Date().toISOString() : false;
};

export const getPrepublishJobName = (contentId: string, repoId: string, suffix?: string) =>
    `prepublish-invalidate-${contentId}-${repoId}${suffix ? `-${suffix}` : ''}`;

export const getUnpublishJobName = (contentId: string, repoId: string, suffix?: string) =>
    `unpublish-${contentId}-${repoId}${suffix ? `-${suffix}` : ''}`;

export const scheduleCacheInvalidation = ({
    jobName,
    id,
    path,
    repoId,
    time,
    masterOnly = true,
}: {
    jobName: string;
    id: string;
    path: string;
    repoId: string;
    time: string;
    masterOnly?: boolean;
}) => {
    createOrUpdateSchedule<PrepublishCacheWipe>({
        jobName,
        jobSchedule: {
            type: 'ONE_TIME',
            value: time,
        },
        taskDescriptor: `${APP_DESCRIPTOR}:prepublish-cache-wipe`,
        taskConfig: {
            path,
            id,
            repoId,
        },
        masterOnly,
    });
};

export const scheduleUnpublish = ({
    id,
    path,
    repoId,
    publishTo,
    masterOnly = true,
}: {
    id: string;
    path: string;
    repoId: string;
    publishTo: string;
    masterOnly?: boolean;
}) => {
    createOrUpdateSchedule<UnpublishExpiredContent>({
        jobName: getUnpublishJobName(id, repoId),
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
        masterOnly,
    });
};

// Returns true if the content was scheduled for prepublishing
export const handleScheduledPublish = (nodeData: NodeEventData, eventType: string) => {
    if (eventType !== 'node.pushed' || !nodeData.path.startsWith('/content/')) {
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
            jobName: getPrepublishJobName(id, repo),
            id,
            path,
            repoId: repo,
            time: publish.from,
        });
        return true;
    }

    return false;
};
