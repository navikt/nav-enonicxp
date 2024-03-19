import * as schedulerLib from '/lib/xp/scheduler';
import { CronSchedule, OneTimeSchedule, UserKey } from '/lib/xp/scheduler';
import * as clusterLib from '/lib/xp/cluster';
import { NavNoDescriptor } from '../../types/common';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { SUPER_USER_FULL } from '../constants';

type Props<TaskConfig extends Record<string, unknown>> = {
    jobName: string;
    jobDescription?: string;
    jobSchedule: CronSchedule | OneTimeSchedule;
    taskDescriptor: NavNoDescriptor;
    taskConfig: TaskConfig;
    enabled?: boolean;
    masterOnly?: boolean;
    user?: UserKey;
    onScheduleExistsAction?: 'modify' | 'overwrite' | 'abort';
};

export const createOrUpdateSchedule = <
    TaskConfig extends Record<string, unknown> = Record<string, unknown>,
>({
    jobName,
    jobDescription,
    jobSchedule,
    taskDescriptor,
    taskConfig,
    enabled = true,
    masterOnly = true,
    user = SUPER_USER_FULL,
    onScheduleExistsAction = 'modify',
}: Props<TaskConfig>) => {
    if (masterOnly && !clusterLib.isMaster()) {
        return;
    }

    const jobParams = {
        name: jobName,
        description: jobDescription,
        descriptor: taskDescriptor,
        config: taskConfig,
        schedule: jobSchedule,
        user: user,
        enabled: enabled,
    };

    return runInContext({ branch: 'master', asAdmin: true }, () => {
        const existingJob = schedulerLib.get({ name: jobName });

        if (existingJob) {
            if (onScheduleExistsAction === 'modify') {
                logger.info(`Scheduler job updated: ${jobName}`);
                return schedulerLib.modify<typeof taskConfig>({
                    name: jobName,
                    editor: (prevJobParams) => {
                        return { ...prevJobParams, ...jobParams };
                    },
                });
            } else if (onScheduleExistsAction === 'overwrite') {
                logger.info(`Removing existing job: ${jobName}`);
                schedulerLib.delete({ name: jobName });
            } else {
                logger.info(`Job already exists, aborting - ${jobName}`);
                return;
            }
        }

        logger.info(`Scheduler job created: ${jobName}`);
        return schedulerLib.create<typeof taskConfig>(jobParams);
    });
};
