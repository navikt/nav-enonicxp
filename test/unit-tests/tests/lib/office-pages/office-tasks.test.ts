import { createOrUpdateSchedule } from '@navno-app/lib/scheduling/schedule-job';
import { createOfficeImportSchedule } from '@navno-app/lib/office-pages/office-tasks';
import * as schedulerLib from '/lib/xp/scheduler';
import { runInContext } from '@navno-app/lib/context/run-in-context';

jest.mock('@navno-app/lib/scheduling/schedule-job', () => ({
    createOrUpdateSchedule: jest.fn(),
}));
jest.mock('@navno-app/lib/office-pages/office-update', () => ({
    fetchAllOfficeDataFromNorg: jest.fn(),
    processAllOffices: jest.fn(),
}));
jest.mock('@navno-app/lib/context/run-in-context', () => ({
    runInContext: jest.fn((_context, callback) => callback()),
}));
jest.mock('/lib/xp/scheduler', () => ({
    get: jest.fn(),
    modify: jest.fn(),
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { critical: jest.fn(), info: jest.fn() },
}));

test('disables the office import schedule on localhost', () => {
    jest.mocked(schedulerLib.get).mockReturnValue({ enabled: true } as never);

    createOfficeImportSchedule('localhost');

    expect(runInContext).toHaveBeenCalledWith(
        { branch: 'master', asAdmin: true },
        expect.any(Function)
    );
    expect(schedulerLib.modify).toHaveBeenCalledWith({
        name: 'legacy_office_import_schedule',
        editor: expect.any(Function),
    });

    expect(createOrUpdateSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
            jobName: 'office_import_schedule',
            enabled: false,
            jobSchedule: {
                type: 'CRON',
                value: '*/10 * * * *',
                timeZone: 'GMT+2:00',
            },
        })
    );
});