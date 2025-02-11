import * as schedulerLib from '/lib/xp/scheduler';
import { CronSchedule, OneTimeSchedule, UserKey } from '/lib/xp/scheduler';
import * as clusterLib from '/lib/xp/cluster';
import { NavNoDescriptor } from '../../types/common';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { SUPER_USER_PRINCIPAL } from '../constants';

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
    user = SUPER_USER_PRINCIPAL,
    onScheduleExistsAction = 'modify',
}: Props<TaskConfig>) => {
    if (masterOnly && !clusterLib.isMaster()) {
        logger.info(`Not master node, skipping scheduling of job: ${jobName}`);
        return;
    } else {
        logger.info(`Is master node, scheduling job: ${jobName}`);
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

    return runInContext({ branch: 'main', asAdmin: true }, () => {
        const existingJob = schedulerLib.get({ name: jobName });

        if (existingJob) {
            if (onScheduleExistsAction === 'modify') {
                logger.info(`Scheduler job updated: ${jobName}`);
                try {
                    return schedulerLib.modify<typeof taskConfig>({
                        name: jobName,
                        editor: (prevJobParams) => {
                            return { ...prevJobParams, ...jobParams };
                        },
                    });
                } catch (e) {
                    logger.error(
                        `Failed to modify job for jobName ${jobName}: ${JSON.stringify(e)}`
                    );
                    return;
                }
            } else if (onScheduleExistsAction === 'overwrite') {
                logger.info(`Removing existing job: ${jobName}`);
                schedulerLib.delete({ name: jobName });
            } else {
                logger.info(`Job already exists, aborting: ${jobName}`);
                return;
            }
        }

        try {
            const scheduleResult = schedulerLib.create<typeof taskConfig>(jobParams);
            logger.info(`Scheduler job created for jobName ${jobName}.`);
            return scheduleResult;
        } catch (e) {
            logger.error(`Failed to schedule job for jobName ${jobName}: ${JSON.stringify(e)}`);
            return;
        }
    });
};
