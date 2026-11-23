import { ScheduledJob } from '@enonic-types/lib-scheduler';
import * as schedulerLib from '/lib/xp/scheduler';
import {
    formatCronSchedule,
    getScheduleDescription,
} from '@navno-app/lib/scheduling/schedule-description';

const schedulerMock = schedulerLib as typeof schedulerLib & {
    __setJobs: (jobs: ScheduledJob[]) => void;
};

describe('Schedule description', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it.each([
        ['* * * * *', 'hvert minutt'],
        ['*/10 * * * *', 'hvert 10. minutt'],
        ['0 6 * * *', 'daglig kl. 06.00'],
        ['30 4 * * 1', 'mandager kl. 04.30'],
        ['0 6 1 * *', '0 6 1 * *'],
        ['0 6-8 * * *', '0 6-8 * * *'],
    ])('formats %s without time zone', (cron, expected) => {
        expect(formatCronSchedule(cron)).toEqual({ text: expected });
    });

    it('gives the run time as an instant when the time zone is a GMT offset', () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-11-17T12:00:00Z'));

        // 06.00 at GMT+2 is 04.00 UTC
        expect(formatCronSchedule('0 6 * * *', 'GMT+2:00')).toEqual({
            text: 'daglig kl.',
            time: '2026-11-17T04:00:00.000Z',
        });
        expect(formatCronSchedule('30 4 * * 1', 'GMT+02:00').time).toBe('2026-11-17T02:30:00.000Z');
        expect(formatCronSchedule('0 6 * * *', 'Europe/Oslo')).toEqual({
            text: 'daglig kl. 06.00',
        });
    });

    it('describes existing schedules and marks disabled ones', () => {
        schedulerMock.__setJobs([
            {
                name: 'disabled-job',
                descriptor: 'no.nav.navno:update-office',
                enabled: false,
                config: {},
                creator: 'user:system:admin',
                modifier: 'user:system:admin',
                createdTime: '2026-01-01T00:00:00Z',
                modifiedTime: '2026-01-01T00:00:00Z',
                schedule: { type: 'CRON', value: '* * * * *', timeZone: 'GMT+2:00' },
            },
        ]);

        expect(getScheduleDescription('disabled-job')).toEqual({
            text: 'hvert minutt',
            isDisabled: true,
        });
        expect(getScheduleDescription('missing-job')).toBeNull();
    });
});
