import { runJobWithResult, STARTED_BY_SCHEDULE } from '../../lib/jobs/job-results';
import { logger } from '../../lib/utils/logging';
import { runSchedulerCleanup } from '../../lib/scheduling/schedule-cleanup';

export const run = () => {
    logger.info('Running scheduler cleanup task');
    runJobWithResult({
        jobName: 'schedulerCleanup',
        startedBy: STARTED_BY_SCHEDULE,
        callback: runSchedulerCleanup,
    });
};
