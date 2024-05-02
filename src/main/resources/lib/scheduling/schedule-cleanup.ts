import { getRepoConnection } from '../utils/repo-utils';
import { batchedNodeQuery } from '../utils/batched-query';
import { logger } from '../utils/logging';
import { createOrUpdateSchedule } from './schedule-job';
import { APP_DESCRIPTOR } from '../constants';
import { SchedulerCleanup } from '@xp-types/tasks/scheduler-cleanup';

// Removes expired one-time jobs
export const runSchedulerCleanup = (dryRun?: boolean) => {
    const repoConnection = getRepoConnection({
        repoId: 'system.scheduler',
        branch: 'master',
        asAdmin: true,
    });

    const now = new Date().toISOString();

    const jobsToPrune = batchedNodeQuery({
        queryParams: {
            count: 10000,
            query: {
                boolean: {
                    must: [
                        {
                            term: {
                                field: 'calendar.type',
                                value: 'ONE_TIME',
                            },
                        },
                        {
                            exists: {
                                field: 'lastRun',
                            },
                        },
                        {
                            range: {
                                field: 'calendar.value',
                                lt: now,
                            },
                        },
                    ],
                },
            },
        },
        repo: repoConnection,
    }).hits;

    const numExpiredJobs = jobsToPrune.length;

    if (numExpiredJobs === 0) {
        logger.info('No expired jobs found');
        return;
    }

    logger.info(`Found ${jobsToPrune.length} expired jobs to prune`);

    if (dryRun) {
        logger.info('Skipping pruning as dryRun flag was set');
        return;
    }

    const result = repoConnection.delete(jobsToPrune.map((job) => job.id));

    logger.info(`Pruned ${result.length} / ${jobsToPrune.length} expired jobs`);
};

export const activateSchedulerCleanupSchedule = () => {
    createOrUpdateSchedule<SchedulerCleanup>({
        jobName: 'scheduler-cleanup',
        jobSchedule: {
            type: 'CRON',
            value: '0 7 * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: `${APP_DESCRIPTOR}:scheduler-cleanup`,
        taskConfig: {},
    });
};
