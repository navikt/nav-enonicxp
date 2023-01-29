import * as schedulerLib from '/lib/xp/scheduler';
import { ScheduledJob } from '/lib/xp/scheduler';
import * as taskLib from '/lib/xp/task';
import { getUnixTimeFromDateTimeString } from '../../lib/utils/nav-utils';
import { runInContext } from '../../lib/context/run-in-context';
import { logger } from '../../lib/utils/logging';

const fifteenSeconds = 15000;

const oneTimeJobFailedToRun = (job: ScheduledJob) => {
    if (job.schedule.type !== 'ONE_TIME' || !job.enabled) {
        return false;
    }

    const jobScheduleTime = getUnixTimeFromDateTimeString(job.schedule.value);

    if (Date.now() < jobScheduleTime) {
        return false;
    }

    const jobLastRunTime = getUnixTimeFromDateTimeString(job.lastRun);

    if (!jobLastRunTime) {
        logger.error(`Job ${job.name} should have ran at ${job.schedule.value} but never ran`);
        return true;
    }

    if (jobLastRunTime < jobScheduleTime) {
        logger.error(
            `Job ${job.name} should have ran at ${job.schedule.value} but last ran at ${job.lastRun}`
        );
        return true;
    }

    return false;
};

export const run = () => {
    // Wait 15 sec past every minute for the one-time scheduler to do its job
    // The cron for this task runs every minute sharp
    taskLib.sleep(fifteenSeconds);

    if (app.config.env !== 'localhost') {
        logger.info('Running fail-safe task for one-time scheduled jobs');
    }

    schedulerLib.list().forEach((job) => {
        if (oneTimeJobFailedToRun(job)) {
            logger.info(
                `Running task for failed one-time job ${job.name} - ${JSON.stringify(job)}`
            );
            runInContext({ branch: 'master', asAdmin: true }, () =>
                schedulerLib.delete({
                    name: job.name,
                })
            );
            taskLib.submitTask({
                descriptor: job.descriptor,
                config: job.config,
            });
        }
    });
};
