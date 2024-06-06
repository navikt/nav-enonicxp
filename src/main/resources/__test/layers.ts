import { LayersRepoData } from '../lib/localization/layers-data';
import { xpMocks } from './__mocks/xp-mocks';

const { server } = xpMocks;

jest.mock('../lib/localization/layers-data', () => ({
    getLayersData: (): LayersRepoData => ({
        defaultLocale: 'no',
        localeToRepoIdMap: { no: server.context.repository },
        repoIdToLocaleMap: { [server.context.repository]: 'no' },
        sources: {
            master: [
                {
                    repoId: server.context.repository,
                    branch: 'master',
                    principals: ['role:system.admin'],
                },
            ],
            draft: [
                {
                    repoId: server.context.repository,
                    branch: 'draft',
                    principals: ['role:system.admin'],
                },
            ],
        },
        locales: ['no'],
    }),
}));
