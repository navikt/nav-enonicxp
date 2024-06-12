import { LayersRepoData } from '../../lib/localization/layers-data';
import { xpMocks } from './xp-mocks';
import { CONTENT_LOCALE_DEFAULT } from '../../lib/constants';

const { server, TEST_SERVER_ENGLISH_PROJECT_ID } = xpMocks;

const englishRepoId = server
    .listRepos()
    .find((repo) => repo.id.endsWith(TEST_SERVER_ENGLISH_PROJECT_ID))!.id;

const layersData: LayersRepoData = {
    defaultLocale: CONTENT_LOCALE_DEFAULT,
    localeToRepoIdMap: { no: server.context.repository, en: englishRepoId },
    repoIdToLocaleMap: {
        [server.context.repository]: CONTENT_LOCALE_DEFAULT,
        [englishRepoId]: 'en',
    },
    sources: {
        master: [
            {
                repoId: server.context.repository,
                branch: 'master',
                principals: ['role:system.admin'],
            },
            {
                repoId: englishRepoId,
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
            {
                repoId: englishRepoId,
                branch: 'draft',
                principals: ['role:system.admin'],
            },
        ],
    },
    locales: [CONTENT_LOCALE_DEFAULT, 'en'],
};

jest.mock('../../lib/localization/layers-data', () => ({
    getLayersData: (): LayersRepoData => layersData,
    isValidLocale: (locale?: string) => locale && layersData.localeToRepoIdMap[locale],
}));
