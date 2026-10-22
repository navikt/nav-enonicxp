import { Request } from '@enonic-types/core';

const mockRender = jest.fn((_view, model) => JSON.stringify(model));
const mockUserIsAdmin = jest.fn();
const mockManageScheduledJobs = jest.fn();
const mockHandleCuratedExportRequest = jest.fn();
const mockExecuteFunction = jest.fn();
const mockListTasks = jest.fn();

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

jest.mock('@navno-app/lib/office-pages/office-tasks', () => ({ runOfficeFetchTask: jest.fn() }));
jest.mock('@navno-app/lib/context/run-in-context', () => ({
    runInContext: (_options: unknown, callback: () => unknown) => callback(),
}));
jest.mock('@navno-app/lib/cache/frontend-cache', () => ({
    frontendInvalidateAllAsync: jest.fn(),
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
jest.mock('@navno-app/lib/localization/layer-publish-info-backfill', () => ({
    backfillLayerPublishInfo: jest.fn(),
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
                schedulerMessage: 'Sletting ble ikke utført: bekreftelse mangler.',
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
                schedulerMessage: 'Slettet scheduler-jobber: legacy_office_import_schedule',
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
    const backfillDescription = 'Sett publiseringsinfo på arvet innhold i layers';

    test('starts the action as a task', () => {
        get(request({ cmd: 'backfillLayerPublishInfo' }));

        expect(mockListTasks).toHaveBeenCalledWith({ state: 'RUNNING' });
        expect(mockExecuteFunction).toHaveBeenCalledTimes(1);
        expect(mockExecuteFunction.mock.calls[0][0].description).toContain(backfillDescription);
    });

    test('does not start the action again while it is running', () => {
        get(request({ cmd: 'backfillLayerPublishInfo' }));
        const { description } = mockExecuteFunction.mock.calls[0][0];
        mockListTasks.mockReturnValue([{ description, state: 'RUNNING' }]);
        mockExecuteFunction.mockClear();

        get(request({ cmd: 'backfillLayerPublishInfo' }));

        expect(mockExecuteFunction).not.toHaveBeenCalled();
        expect(mockRender).toHaveBeenLastCalledWith(
            'webapp.html',
            expect.objectContaining({
                schedulerMessage: expect.stringContaining('Jobben kjører allerede'),
                runningCmd: undefined,
            })
        );
    });
});
