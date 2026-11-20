import { Request } from '@enonic-types/core';

const mockRender = jest.fn((_view, model) => JSON.stringify(model));
const mockUserIsAdmin = jest.fn();
const mockManageScheduledJobs = jest.fn();
const mockHandleCuratedExportRequest = jest.fn();
const mockExecuteFunction = jest.fn();
const mockListTasks = jest.fn();
const mockGetJobResult = jest.fn();
const mockRunJobWithResult = jest.fn();
const mockGetUser = jest.fn();
const mockGetScheduleDescription = jest.fn();
const mockRunOfficeFetchTask = jest.fn();

jest.mock(
    '/lib/thymeleaf',
    () => ({
        __esModule: true,
        default: { render: mockRender },
    }),
    { virtual: true }
);

jest.mock(
    '/lib/xp/task',
    () => ({
        executeFunction: mockExecuteFunction,
        list: mockListTasks,
    }),
    { virtual: true }
);

jest.mock('/lib/xp/auth', () => ({ getUser: mockGetUser }), { virtual: true });

jest.mock('@navno-app/lib/jobs/job-results', () => ({
    getJobResult: mockGetJobResult,
    runJobWithResult: mockRunJobWithResult,
}));

jest.mock('@navno-app/lib/office-pages/office-tasks', () => ({
    runOfficeFetchTask: mockRunOfficeFetchTask,
}));
jest.mock('@navno-app/lib/context/run-in-context', () => ({
    runInContext: (_options: unknown, callback: () => unknown) => callback(),
}));
jest.mock('@navno-app/lib/cache/frontend-cache', () => ({
    frontendInvalidateAllSync: jest.fn(),
}));
jest.mock('@navno-app/lib/sitemap/sitemap', () => ({ requestSitemapUpdate: jest.fn() }));
jest.mock('@navno-app/lib/scheduling/scheduled-publish-updater', () => ({
    updateScheduledPublishJobs: jest.fn(),
}));
jest.mock('@navno-app/lib/utils/uuid', () => ({ generateUUID: jest.fn() }));
jest.mock('@navno-app/lib/contentlists/remove-unpublished', () => ({
    removeUnpublishedFromAllContentLists: jest.fn(),
}));
jest.mock('@navno-app/lib/utils/auth-utils', () => ({
    userIsAdmin: mockUserIsAdmin,
}));
jest.mock('@navno-app/lib/search/update-all', () => ({ externalSearchUpdateAll: jest.fn() }));
jest.mock('@navno-app/lib/constants', () => ({ URLS: {} }));
jest.mock('@navno-app/lib/scheduling/schedule-description', () => ({
    getScheduleDescription: mockGetScheduleDescription,
}));
jest.mock('@navno-app/lib/scheduling/schedule-cleanup', () => ({
    runSchedulerCleanup: jest.fn(),
}));
jest.mock('@navno-app/lib/reporting/NAVOccurrences', () => ({ NAVOccurences: jest.fn() }));
jest.mock('@navno-app/lib/archiving/archive-old-news', () => ({ archiveOldNews: jest.fn() }));
jest.mock('@navno-app/lib/scheduling/manage-scheduled-jobs', () => ({
    manageScheduledJobs: mockManageScheduledJobs,
}));
jest.mock('@navno-app/lib/curated-export/source/access', () => ({
    handleCuratedExportRequest: mockHandleCuratedExportRequest,
}));

type PostHandler = typeof import('@navno-app/webapp/webapp').post;

type GetHandler = typeof import('@navno-app/webapp/webapp').get;

let post: PostHandler;
let get: GetHandler;

beforeAll(async () => {
    Object.assign(globalThis, {
        resolve: jest.fn(() => 'webapp.html'),
    });
    ({ post, get } = await import('@navno-app/webapp/webapp'));
});

beforeEach(() => {
    mockUserIsAdmin.mockReturnValue(true);
    mockHandleCuratedExportRequest.mockReturnValue(null);
    mockListTasks.mockReturnValue([]);
    mockGetJobResult.mockReturnValue(null);
    mockGetScheduleDescription.mockReturnValue(null);
    mockGetUser.mockReturnValue({ displayName: 'Ola Nordmann', login: 'ola' });
    mockManageScheduledJobs.mockReturnValue({
        selectedJobs: [],
        missingJobNames: [],
        deletedJobNames: [],
    });
});

const request = (params: Record<string, string> = {}) => ({ params }) as Request;

describe('Webapp scheduler cleanup', () => {
    test('rejects non-admin users', () => {
        mockUserIsAdmin.mockReturnValue(false);

        const response = post(request());

        expect(response.body).toContain('Administrator-tilgang er påkrevd');
        expect(mockManageScheduledJobs).not.toHaveBeenCalled();
    });

    test('does not delete without explicit confirmation', () => {
        post(request({ cmd: 'deleteObsoleteSchedulerJobs' }));

        expect(mockManageScheduledJobs).toHaveBeenCalledTimes(1);
        expect(mockManageScheduledJobs).toHaveBeenCalledWith({ operation: 'list-obsolete' });
        expect(mockRender).toHaveBeenCalledWith(
            'webapp.html',
            expect.objectContaining({
                message: 'Sletting ble ikke utført: bekreftelse mangler.',
            })
        );
    });

    test('deletes obsolete jobs after explicit confirmation', () => {
        mockManageScheduledJobs
            .mockReturnValueOnce({
                selectedJobs: [],
                missingJobNames: [],
                deletedJobNames: ['legacy_office_import_schedule'],
            })
            .mockReturnValueOnce({
                selectedJobs: [],
                missingJobNames: [],
                deletedJobNames: [],
            });

        post(
            request({
                cmd: 'deleteObsoleteSchedulerJobs',
                confirmDelete: 'true',
            })
        );

        expect(mockManageScheduledJobs).toHaveBeenNthCalledWith(1, {
            operation: 'delete-obsolete',
            confirmDelete: true,
        });
        expect(mockManageScheduledJobs).toHaveBeenNthCalledWith(2, {
            operation: 'list-obsolete',
        });
        expect(mockRender).toHaveBeenCalledWith(
            'webapp.html',
            expect.objectContaining({
                message: 'Slettet scheduler-jobber: legacy_office_import_schedule',
            })
        );
    });
});

describe('Webapp curated export routes', () => {
    test('are handled before the session admin check, since they use their own token', () => {
        mockUserIsAdmin.mockReturnValue(false);
        mockHandleCuratedExportRequest.mockReturnValue({ status: 401 });

        expect(post(request())).toEqual({ status: 401 });
        expect(mockManageScheduledJobs).not.toHaveBeenCalled();
    });
});

describe('Webapp actions', () => {
    const cleanupDescription = 'Fjern expired scheduler jobs';

    test('starts the action as a task', () => {
        get(request({ cmd: 'schedulerCleanup' }));

        expect(mockExecuteFunction).toHaveBeenCalledTimes(1);
        expect(mockExecuteFunction.mock.calls[0][0].description).toContain(cleanupDescription);
    });

    const runAgainWithExistingTask = (state: string) => {
        get(request({ cmd: 'schedulerCleanup' }));
        const { description } = mockExecuteFunction.mock.calls[0][0];
        mockListTasks.mockReturnValue([
            { description, state, progress: { info: '', current: 0, total: 0 } },
        ]);
        mockExecuteFunction.mockClear();

        get(request({ cmd: 'schedulerCleanup' }));
    };

    test.each(['RUNNING', 'WAITING'])('does not start the action again while it is %s', (state) => {
        runAgainWithExistingTask(state);

        expect(mockExecuteFunction).not.toHaveBeenCalled();
        expect(mockRender).toHaveBeenLastCalledWith(
            'webapp.html',
            expect.objectContaining({
                message: expect.stringContaining('Jobben kjører allerede'),
                runningCmd: undefined,
            })
        );
    });

    test.each(['FINISHED', 'FAILED'])('starts the action again after a %s run', (state) => {
        runAgainWithExistingTask(state);

        expect(mockExecuteFunction).toHaveBeenCalledTimes(1);
    });

    test('runs the action through the job result wrapper with the current user', () => {
        get(request({ cmd: 'schedulerCleanup' }));
        mockExecuteFunction.mock.calls[0][0].func();

        expect(mockRunJobWithResult).toHaveBeenCalledWith(
            expect.objectContaining({
                jobName: 'schedulerCleanup',
                startedBy: 'Ola Nordmann',
            })
        );
    });

    test('fails the office import when the import was skipped', () => {
        mockRunOfficeFetchTask.mockReturnValue({
            fetchedFromNorg: 0,
            skipped: 'NORG ga 0 kontorer',
        });

        get(request({ cmd: 'norg' }));
        mockExecuteFunction.mock.calls[0][0].func();
        const { callback } = mockRunJobWithResult.mock.calls[0][0];

        expect(callback).toThrow('Importen ble hoppet over: NORG ga 0 kontorer');
    });
});

describe('Webapp job results', () => {
    const getRenderedCmd = (cmdName: string) =>
        mockRender.mock.lastCall?.[1].cmds.find((cmd: { cmd: string }) => cmd.cmd === cmdName);

    test('shows a job stored as running without an active task as aborted', () => {
        mockGetJobResult.mockImplementation((jobName: string) =>
            jobName === 'norg'
                ? { status: 'running', startedAt: '2026-11-17T09:00:00.000Z', startedBy: 'ola' }
                : null
        );

        get(request());

        expect(getRenderedCmd('norg').lastResult.statusText).toBe('Avbrutt');
        expect(getRenderedCmd('norg').lastResult.statusKey).toBe('aborted');
        expect(getRenderedCmd('wipeCache').lastResult).toBeNull();
    });

    test.each([
        ['2026-11-17T09:00:42.000Z', '42 s'],
        ['2026-11-17T09:02:05.000Z', '2 min 5 s'],
        ['2026-11-17T10:03:00.000Z', '1 t 3 min'],
    ])('shows the duration of a job finished at %s as %s', (finishedAt, duration) => {
        mockGetJobResult.mockReturnValue({
            status: 'ok',
            startedAt: '2026-11-17T09:00:00.000Z',
            finishedAt,
            startedBy: 'ola',
        });

        get(request());

        expect(getRenderedCmd('norg').lastResult).toMatchObject({ statusKey: 'ok', duration });
    });

    test('shows progress for a running job', () => {
        mockGetJobResult.mockReturnValue({
            status: 'running',
            startedAt: '2026-11-17T09:00:00.000Z',
            startedBy: 'ola',
        });
        mockListTasks.mockReturnValue([
            {
                description: 'Oppdater kontor fra norg',
                state: 'RUNNING',
                progress: { info: 'Henter kontorer', current: 3, total: 10 },
            },
        ]);

        get(request());

        const norg = getRenderedCmd('norg');
        expect(norg.lastResult.statusText).toBe('Kjører');
        expect(norg.progress).toBe('Henter kontorer – 3 av 10');
        expect(mockRender.mock.lastCall?.[1].hasRunningJobs).toBe(true);
    });

    test('shows the scheduler run when the scheduled run was not recorded', () => {
        mockGetScheduleDescription.mockReturnValue({
            text: 'hvert minutt',
            isDisabled: false,
            lastRun: '2026-11-17T14:21:00.000Z',
        });

        get(request());

        expect(getRenderedCmd('norg').lastScheduledRun).toBe('2026-11-17T14:21:00.000Z');
    });

    test('shows only the stored result when it is from the latest scheduled run', () => {
        mockGetScheduleDescription.mockReturnValue({
            text: 'daglig kl.',
            isDisabled: false,
            lastRun: '2026-11-17T05:00:00.000Z',
        });
        mockGetJobResult.mockImplementation((jobName: string) =>
            jobName === 'schedulerCleanup'
                ? { status: 'finished', startedAt: '2026-11-17T05:00:01.000Z', startedBy: 'x' }
                : null
        );

        get(request());

        expect(getRenderedCmd('schedulerCleanup').lastScheduledRun).toBeNull();
    });
});
