import schedulerLib, { ScheduledJob } from '/lib/xp/scheduler';
import taskLib from '/lib/xp/task';

const fifteenSeconds = 15000;

const oneTimeJobFailedToRun = (job: ScheduledJob) => {
    if (job.schedule.type !== 'ONE_TIME') {
        return false;
    }

    const jobScheduleTime = new Date(job.schedule.value).getTime();
    const jobLastRunTime = job.lastRun && new Date(job.lastRun).getTime();

    if (Date.now() <= jobScheduleTime) {
        return false;
    }

    if (!jobLastRunTime) {
        log.error(`Job ${job.name} should have ran at ${job.schedule.value} but never ran`);
        return true;
    }

    if (jobLastRunTime < jobScheduleTime) {
        log.error(
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

    log.info('Running fail-safe task for one-time scheduled jobs');

    schedulerLib.list().forEach((job) => {
        if (oneTimeJobFailedToRun(job)) {
            log.error(`Running task for failed one-time job ${job.name}`);
            schedulerLib.modify({
                name: job.name,
                editor: (edit) => {
                    edit.enabled = false;
                    return edit;
                },
            });
            taskLib.submitTask({
                descriptor: job.descriptor,
                config: job.config,
            });
        }
    });
};
