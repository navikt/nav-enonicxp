import schedulerLib, {
    ScheduleTypeCron,
    ScheduleTypeOneTime,
    PrincipalKeyUser,
} from '/lib/xp/scheduler';
import { NavNoDescriptor } from '../../types/common';
import { runInBranchContext } from './branch-context';

type Props<TaskConfig> = {
    jobName: string;
    jobDescription?: string;
    jobSchedule: ScheduleTypeCron | ScheduleTypeOneTime;
    taskDescriptor: NavNoDescriptor;
    taskConfig: TaskConfig;
    enabled?: boolean;
    user?: PrincipalKeyUser;
};

export const createOrUpdateSchedule = <TaskConfig = Record<string, any>>({
    jobName,
    jobDescription,
    jobSchedule,
    taskDescriptor,
    taskConfig,
    enabled = true,
    user = 'user:system:su',
}: Props<TaskConfig>) => {
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
            log.info(`Scheduler job updated: ${jobName}`);
            return schedulerLib.modify<typeof taskConfig>({
                name: jobName,
                editor: (prevJobParams) => {
                    return { ...prevJobParams, ...jobParams };
                },
            });
        } else {
            log.info(`Scheduler job created: ${jobName}`);
            return schedulerLib.create<typeof taskConfig>(jobParams);
        }
    }, 'master');
};
