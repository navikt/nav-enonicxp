import { createOrUpdateSchedule } from './schedule-job';
import { APP_DESCRIPTOR } from '../constants';

// Failsafe to ensure the one-time scheduler is doing its job :)
export const startFailsafeSchedule = () => {
    createOrUpdateSchedule({
        jobName: 'scheduler-onetime-failsafe',
        jobSchedule: {
            type: 'CRON',
            value: '* * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: `${APP_DESCRIPTOR}:scheduler-onetime-failsafe`,
        taskConfig: {},
    });
};
