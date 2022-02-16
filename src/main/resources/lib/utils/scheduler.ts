import schedulerLib, {
    ScheduleTypeCron,
    ScheduleTypeOneTime,
    PrincipalKeyUser,
} from '/lib/xp/scheduler';
import { NavNoDescriptor } from '../../types/common';
import { runInBranchContext } from './branch-context';

type Props = {
    jobName: string;
    jobDescription?: string;
    jobSchedule: ScheduleTypeCron | ScheduleTypeOneTime;
    taskDescriptor: NavNoDescriptor;
    taskConfig?: Record<string, any>;
    enabled?: boolean;
    user?: PrincipalKeyUser;
};

export const createOrModifySchedule = ({
    jobName,
    jobDescription,
    jobSchedule,
    taskDescriptor,
    taskConfig,
    enabled = true,
    user = 'user:system:su',
}: Props) => {
    const existingJob = schedulerLib.get({ name: jobName });

    log.info(`Existing job: ${JSON.stringify(existingJob)}`);

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
        if (existingJob) {
            log.info(`Job modified: ${jobName}`);
            return schedulerLib.modify<typeof taskConfig>({
                name: jobName,
                editor: (prevJobParams) => {
                    return { ...prevJobParams, ...jobParams };
                },
            });
        } else {
            log.info(`Job created: ${jobName}`);
            return schedulerLib.create<typeof taskConfig>(jobParams);
        }
    }, 'master');
};
