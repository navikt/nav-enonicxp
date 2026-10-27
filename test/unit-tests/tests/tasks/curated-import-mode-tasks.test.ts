const runOfficeFetchTask = jest.fn();
const archiveOldNews = jest.fn();
const getRepoConnection = jest.fn(() => ({ get: () => null }));

jest.mock('@navno-app/lib/office-pages/office-tasks', () => ({ runOfficeFetchTask }));
jest.mock('@navno-app/lib/archiving/archive-old-news', () => ({ archiveOldNews }));
jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection }));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { info: jest.fn(), warning: jest.fn(), error: jest.fn(), critical: jest.fn() },
}));

import { run as runUpdateOffice } from '@navno-app/tasks/update-office/update-office';
import { run as runArchiveOldNews } from '@navno-app/tasks/archive-old-news/archive-old-news';
import { run as runUnpublishExpired } from '@navno-app/tasks/unpublish-expired-content/unpublish-expired-content';

describe('content-writing scheduled tasks during a curated import', () => {
    const originalConfig = app.config;

    afterEach(() => {
        app.config = originalConfig;
    });

    const runAll = () => {
        runUpdateOffice();
        runArchiveOldNews();
        runUnpublishExpired({ id: 'content-id', path: '/content/www.nav.no/page' });
    };

    test('are skipped in a local sandbox in import mode', () => {
        app.config = { ...originalConfig, env: 'localhost', curatedImportInProgress: 'true' };
        runAll();
        expect(runOfficeFetchTask).not.toHaveBeenCalled();
        expect(archiveOldNews).not.toHaveBeenCalled();
        expect(getRepoConnection).not.toHaveBeenCalled();
    });

    test.each([
        ['localhost', undefined],
        ['p', 'true'],
    ] as const)('run normally with env=%s and import mode=%s', (env, mode) => {
        app.config = { ...originalConfig, env, curatedImportInProgress: mode };
        runAll();
        expect(runOfficeFetchTask).toHaveBeenCalledTimes(1);
        expect(archiveOldNews).toHaveBeenCalledTimes(1);
        expect(getRepoConnection).toHaveBeenCalledTimes(1);
    });
});
