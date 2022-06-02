import contentLib from '/lib/xp/content';
import clusterLib from '/lib/xp/cluster';
import schedulerLib from '/lib/xp/scheduler';
import { runInBranchContext } from '../utils/branch-context';
import {
    getPrepublishJobName,
    getUnpublishJobName,
    scheduleCacheInvalidation,
    scheduleUnpublish,
} from './scheduled-publish';
import { logger } from '../utils/logging';

const schedulePrepublishTasks = () => {
    const result = runInBranchContext(
        () =>
            contentLib.query({
                count: 10000,
                query: `publish.from > instant("${new Date().toISOString()}")`,
            }),
        'draft'
    ).hits;

    logger.info(`Updating scheduled prepublish jobs for ${result.length} items`);

    result.forEach((content) => {
        if (content.publish?.from) {
            const existingJob = schedulerLib.get({ name: getPrepublishJobName(content._id) });

            if (!existingJob) {
                scheduleCacheInvalidation({
                    id: content._id,
                    path: content._path,
                    publishFrom: content.publish.from,
                });
            }
        }
    });
};

const scheduleUnpublishTasks = () => {
    const result = runInBranchContext(
        () =>
            contentLib.query({
                count: 10000,
                query: 'publish.to LIKE "*"',
            }),
        'master'
    ).hits;

    logger.info(`Updating scheduled unpublish jobs for ${result.length} items`);

    result.forEach((content) => {
        if (content.publish?.to) {
            const existingJob = schedulerLib.get({ name: getUnpublishJobName(content._id) });

            if (!existingJob) {
                scheduleUnpublish({
                    id: content._id,
                    path: content._path,
                    publishTo: content.publish.to,
                });
            }
        }
    });
};

export const updateScheduledPublishJobs = () => {
    if (clusterLib.isMaster()) {
        schedulePrepublishTasks();
        scheduleUnpublishTasks();
    } else {
        logger.warning('updateScheduledPublishJobs will only run on master');
    }
};
