import * as schedulerLib from '/lib/xp/scheduler';
import { ScheduleTypeCron, ScheduleTypeOneTime, PrincipalKeyUser } from '/lib/xp/scheduler';
import * as clusterLib from '/lib/xp/cluster';
import { NavNoDescriptor } from '../../types/common';
import { runInBranchContext } from '../utils/branch-context';
import { logger } from '../utils/logging';

type Props<TaskConfig> = {
    jobName: string;
    jobDescription?: string;
    jobSchedule: ScheduleTypeCron | ScheduleTypeOneTime;
    taskDescriptor: NavNoDescriptor;
    taskConfig: TaskConfig;
    enabled?: boolean;
    masterOnly?: boolean;
    user?: PrincipalKeyUser;
    onScheduleExistsAction?: 'modify' | 'overwrite' | 'abort';
};

export const createOrUpdateSchedule = <TaskConfig = Record<string, any>>({
    jobName,
    jobDescription,
    jobSchedule,
    taskDescriptor,
    taskConfig,
    enabled = true,
    masterOnly = true,
    user = 'user:system:su',
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

    return runInBranchContext(() => {
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
    }, 'master');
};
