import * as contentLib from '/lib/xp/content';
import * as clusterLib from '/lib/xp/cluster';
import * as schedulerLib from '/lib/xp/scheduler';
import {
    getPrepublishJobName,
    getUnpublishJobName,
    scheduleCacheInvalidation,
    scheduleUnpublish,
} from './scheduled-publish';
import { logger } from '../utils/logging';
import {
    getLayersMultiConnection,
    sortMultiRepoNodeHitIdsToLocaleBuckets,
} from '../localization/locale-utils';
import { runInLocaleContext } from '../localization/locale-context';
import { getLayersData } from '../localization/layers-data';

const schedulePrepublishTasks = () => {
    const multiRepoConnection = getLayersMultiConnection('draft');

    const nodeHits = multiRepoConnection.query({
        count: 2000,
        query: `publish.from > instant("${new Date().toISOString()}")`,
    }).hits;

    logger.info(`Updating scheduled prepublish jobs for ${nodeHits.length} items`);

    const localeBuckets = sortMultiRepoNodeHitIdsToLocaleBuckets(nodeHits);

    Object.entries(localeBuckets).forEach(([repoId, nodeIds]) => {
        const { repoIdToLocaleMap } = getLayersData();
        const locale = repoIdToLocaleMap[repoId];

        const contentHits = runInLocaleContext(
            { locale, branch: 'draft' },
            () =>
                contentLib.query({
                    start: 0,
                    count: nodeIds.length,
                    filters: {
                        ids: { values: nodeIds },
                    },
                }).hits
        );

        contentHits.forEach((content) => {
            if (content.publish?.from) {
                const existingJob = schedulerLib.get({ name: getPrepublishJobName(content._id) });
                if (!existingJob) {
                    logger.warning(
                        `Scheduled job for prepublish was missing for content ${content._path} in repo ${repoId}`
                    );
                    scheduleCacheInvalidation({
                        id: content._id,
                        path: content._path,
                        repoId: repoId,
                        publishFrom: content.publish.from,
                    });
                }
            }
        });
    });
};

const scheduleUnpublishTasks = () => {
    const multiRepoConnection = getLayersMultiConnection('master');

    const nodeHits = multiRepoConnection.query({
        count: 2000,
        query: 'publish.to LIKE "*"',
    }).hits;

    logger.info(`Updating scheduled unpublish jobs for ${nodeHits.length} items`);

    const localeBuckets = sortMultiRepoNodeHitIdsToLocaleBuckets(nodeHits);

    Object.entries(localeBuckets).forEach(([repoId, nodeIds]) => {
        const { repoIdToLocaleMap } = getLayersData();
        const locale = repoIdToLocaleMap[repoId];

        const contentHits = runInLocaleContext(
            { locale, branch: 'master' },
            () =>
                contentLib.query({
                    start: 0,
                    count: nodeIds.length,
                    filters: {
                        ids: { values: nodeIds },
                    },
                }).hits
        );

        contentHits.forEach((content) => {
            if (content.publish?.to) {
                const existingJob = schedulerLib.get({ name: getUnpublishJobName(content._id) });
                if (!existingJob) {
                    logger.warning(
                        `Scheduled job for unpublish was missing for content ${content._path} in repo ${repoId}`
                    );
                    scheduleUnpublish({
                        id: content._id,
                        path: content._path,
                        repoId: repoId,
                        publishTo: content.publish.to,
                    });
                }
            }
        });
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
