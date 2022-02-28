import contentLib from '/lib/xp/content';
import clusterLib from '/lib/xp/cluster';
import { runInBranchContext } from '../utils/branch-context';
import { scheduleCacheInvalidation, scheduleUnpublish } from './scheduled-publish';

const schedulePrepublishTasks = () => {
    const result = runInBranchContext(
        () =>
            contentLib.query({
                count: 10000,
                query: `publish.from > instant("${new Date().toISOString()}")`,
            }),
        'draft'
    ).hits;

    log.info(`Updating scheduled prepublish jobs for ${result.length} items`);

    result.forEach((content) => {
        if (content.publish?.from) {
            scheduleCacheInvalidation({
                id: content._id,
                path: content._path,
                publishFrom: content.publish.from,
            });
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

    log.info(`Updating scheduled unpublish jobs for ${result.length} items`);

    result.forEach((content) => {
        if (content.publish?.to) {
            scheduleUnpublish({
                id: content._id,
                path: content._path,
                publishTo: content.publish.to,
            });
        }
    });
};

export const updateScheduledPublishJobs = () => {
    if (clusterLib.isMaster()) {
        schedulePrepublishTasks();
        scheduleUnpublishTasks();
    } else {
        log.warning('updateScheduledPublishJobs will only run on master');
    }
};
