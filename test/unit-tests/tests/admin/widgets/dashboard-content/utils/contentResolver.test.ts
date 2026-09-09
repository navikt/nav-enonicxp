import { getRepoConnection } from '@navno-app/lib/repos/repo-utils';
import { logger } from '@navno-app/lib/utils/logging';
import { dashboardContentResolveLogs } from '@navno-app/admin/widgets/dashboard-content/utils/contentResolver';
import { ContentLogData } from '@navno-app/admin/widgets/dashboard-content/utils/types';

jest.mock('/lib/xp/content', () => ({
    getType: jest.fn(),
}));

jest.mock('@navno-app/lib/repos/repo-utils', () => ({
    getContentProjectIdFromRepoId: jest.fn(),
    getRepoConnection: jest.fn(),
}));

jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: {
        warning: jest.fn(),
    },
}));

const getRepoConnectionMock = getRepoConnection as jest.MockedFunction<typeof getRepoConnection>;
const loggerMock = logger as jest.Mocked<typeof logger>;

const logEntry = (repoId: string): ContentLogData => ({
    contentId: 'content-id',
    repoId,
    time: '2026-08-05T12:00:00Z',
    publish: {},
});

describe('Dashboard content resolver', () => {
    test('skips audit entries for deleted repositories', () => {
        getRepoConnectionMock
            .mockImplementationOnce(() => {
                throw new Error('Repository not found');
            })
            .mockReturnValueOnce({ get: jest.fn(() => null) } as never);

        const result = dashboardContentResolveLogs(
            [logEntry('com.enonic.cms.navno-samisk'), logEntry('com.enonic.cms.default')],
            true
        );

        expect(result).toEqual([]);
        expect(getRepoConnectionMock).toHaveBeenCalledTimes(2);
        expect(loggerMock.warning).toHaveBeenCalledWith(
            expect.stringContaining('com.enonic.cms.navno-samisk')
        );
    });
});