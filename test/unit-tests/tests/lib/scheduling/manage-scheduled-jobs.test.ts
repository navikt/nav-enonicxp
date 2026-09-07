import { ScheduledJob } from '@enonic-types/lib-scheduler';
import * as schedulerLib from '/lib/xp/scheduler';
import {
    manageScheduledJobs,
    OBSOLETE_SCHEDULED_JOB_NAMES,
} from '@navno-app/lib/scheduling/manage-scheduled-jobs';

const schedulerMock = schedulerLib as typeof schedulerLib & {
    __setJobs: (jobs: ScheduledJob[]) => void;
};

const createJob = (name: string): ScheduledJob => ({
    name,
    descriptor: 'no.nav.navno:update-office',
    enabled: true,
    config: {},
    creator: 'user:system:admin',
    modifier: 'user:system:admin',
    createdTime: '2026-01-01T00:00:00Z',
    modifiedTime: '2026-01-01T00:00:00Z',
    schedule: {
        type: 'CRON',
        value: '* * * * *',
        timeZone: 'GMT+2:00',
    },
});

describe('Manage scheduled jobs', () => {
    beforeEach(() => {
        schedulerMock.__setJobs([createJob('current-job'), createJob('obsolete-job')]);
        jest.restoreAllMocks();
    });

    test('lists jobs without deleting them', () => {
        const deleteSpy = jest.spyOn(schedulerLib, 'delete');

        const result = manageScheduledJobs({ operation: 'list' });

        expect(schedulerLib.list()).toHaveLength(2);
        expect(result.selectedJobs.map((job) => job.name)).toEqual(['current-job', 'obsolete-job']);
        expect(deleteSpy).not.toHaveBeenCalled();
    });

    test('returns only known obsolete jobs for the Webapp', () => {
        schedulerMock.__setJobs([
            createJob('current-job'),
            createJob(OBSOLETE_SCHEDULED_JOB_NAMES[1]),
        ]);

        const result = manageScheduledJobs({ operation: 'list-obsolete' });

        expect(result.selectedJobs.map((job) => job.name)).toEqual([
            OBSOLETE_SCHEDULED_JOB_NAMES[1],
        ]);
        expect(result.missingJobNames).toEqual([
            OBSOLETE_SCHEDULED_JOB_NAMES[0],
            OBSOLETE_SCHEDULED_JOB_NAMES[2],
            OBSOLETE_SCHEDULED_JOB_NAMES[3],
        ]);
    });

    test('refuses deletion without confirmation', () => {
        manageScheduledJobs({ operation: 'delete', jobNames: 'obsolete-job' });

        expect(schedulerLib.get({ name: 'obsolete-job' })).not.toBeNull();
    });

    test('refuses deletion without exact job names', () => {
        manageScheduledJobs({ operation: 'delete', confirmDelete: true });

        expect(schedulerLib.list()).toHaveLength(2);
    });

    test('deletes only explicitly named jobs', () => {
        manageScheduledJobs({
            operation: 'delete',
            jobNames: ['obsolete-job', 'missing-job'],
            confirmDelete: true,
        });

        expect(schedulerLib.get({ name: 'obsolete-job' })).toBeNull();
        expect(schedulerLib.get({ name: 'current-job' })).not.toBeNull();
    });

    test('deletes only known obsolete jobs', () => {
        schedulerMock.__setJobs([
            createJob('current-job'),
            ...OBSOLETE_SCHEDULED_JOB_NAMES.map(createJob),
        ]);

        const result = manageScheduledJobs({
            operation: 'delete-obsolete',
            confirmDelete: true,
        });

        expect(schedulerLib.list().map((job) => job.name)).toEqual(['current-job']);
        expect(result.deletedJobNames).toEqual(OBSOLETE_SCHEDULED_JOB_NAMES);
    });
});
