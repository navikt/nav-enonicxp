import { createOrUpdateSchedule } from '../utils/scheduler';
import { appDescriptor } from '../constants';

// Failsafe to ensure the one-time scheduler is doing its job :)
export const startFailsafeSchedule = () => {
    createOrUpdateSchedule({
        jobName: 'scheduler-onetime-failsafe',
        jobSchedule: {
            type: 'CRON',
            value: '* * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: `${appDescriptor}:scheduler-onetime-failsafe`,
        taskConfig: {},
    });
};
