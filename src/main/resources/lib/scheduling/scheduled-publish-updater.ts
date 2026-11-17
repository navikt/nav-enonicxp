import * as schedulerLib from '/lib/xp/scheduler';
import {
    getPrepublishJobName,
    getUnpublishJobName,
    scheduleCacheInvalidation,
    scheduleUnpublish,
} from './scheduled-publish';
import { logger } from '../utils/logging';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';

const schedulePrepublishTasks = () => {
    const result = { scheduled: 0, missingJobs: 0 };

    const nodeHitsBuckets = queryAllLayersToRepoIdBuckets({
        queryParams: {
            count: 2000,
            query: `publish.from > instant("${new Date().toISOString()}")`,
        },
        resolveContent: true,
        branch: 'draft',
        state: 'localized',
    });

    Object.entries(nodeHitsBuckets).forEach(([repoId, contentHits]) => {
        logger.info(
            `Updating scheduled prepublish jobs for ${contentHits.length} items in repo ${repoId}`
        );

        contentHits.forEach((content) => {
            if (!content.publish?.from) {
                return;
            }

            const existingJob = schedulerLib.get({
                name: getPrepublishJobName(content._id, repoId),
            });
            if (!existingJob) {
                result.missingJobs++;
                logger.warning(
                    `Scheduled job for prepublish was missing for content ${content._path} in repo ${repoId}`
                );
            }

            scheduleCacheInvalidation({
                jobName: getPrepublishJobName(content._id, repoId),
                id: content._id,
                path: content._path,
                repoId: repoId,
                time: content.publish.from,
                masterOnly: false,
            });
            result.scheduled++;
        });
    });

    return result;
};

const scheduleUnpublishTasks = () => {
    const result = { scheduled: 0, missingJobs: 0 };

    const nodeHitsBuckets = queryAllLayersToRepoIdBuckets({
        queryParams: {
            count: 2000,
            query: 'publish.to LIKE "*"',
        },
        resolveContent: true,
        branch: 'master',
        state: 'localized',
    });

    Object.entries(nodeHitsBuckets).forEach(([repoId, contentHits]) => {
        logger.info(
            `Updating scheduled unpublish jobs for ${contentHits.length} items in repo ${repoId}`
        );

        contentHits.forEach((content) => {
            if (!content.publish?.to) {
                return;
            }

            const existingJob = schedulerLib.get({
                name: getUnpublishJobName(content._id, repoId),
            });
            if (!existingJob) {
                result.missingJobs++;
                logger.warning(
                    `Scheduled job for unpublish was missing for content ${content._path} in repo ${repoId}`
                );
            }

            scheduleUnpublish({
                id: content._id,
                path: content._path,
                repoId: repoId,
                publishTo: content.publish.to,
                masterOnly: false,
            });
            result.scheduled++;
        });
    });

    return result;
};

export const updateScheduledPublishJobs = () => ({
    prepublish: schedulePrepublishTasks(),
    unpublish: scheduleUnpublishTasks(),
});
