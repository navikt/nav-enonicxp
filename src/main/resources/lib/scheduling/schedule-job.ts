import schedulerLib, {
    ScheduleTypeCron,
    ScheduleTypeOneTime,
    PrincipalKeyUser,
} from '/lib/xp/scheduler';
import clusterLib from '/lib/xp/cluster';
import { NavNoDescriptor } from '../../types/common';
import { runInBranchContext } from '../utils/branch-context';

type Props<TaskConfig> = {
    jobName: string;
    jobDescription?: string;
    jobSchedule: ScheduleTypeCron | ScheduleTypeOneTime;
    taskDescriptor: NavNoDescriptor;
    taskConfig: TaskConfig;
    enabled?: boolean;
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
    user = 'user:system:su',
    onScheduleExistsAction = 'modify',
}: Props<TaskConfig>) => {
    if (!clusterLib.isMaster()) {
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
                log.info(`Scheduler job updated: ${jobName}`);
                return schedulerLib.modify<typeof taskConfig>({
                    name: jobName,
                    editor: (prevJobParams) => {
                        return { ...prevJobParams, ...jobParams };
                    },
                });
            } else if (onScheduleExistsAction === 'overwrite') {
                log.info(`Removing existing job: ${jobName}`);
                schedulerLib.delete({ name: jobName });
            } else {
                log.info(`Job already exists, aborting - ${jobName}`);
                return;
            }
        }

        log.info(`Scheduler job created: ${jobName}`);
        return schedulerLib.create<typeof taskConfig>(jobParams);
    }, 'master');
};
