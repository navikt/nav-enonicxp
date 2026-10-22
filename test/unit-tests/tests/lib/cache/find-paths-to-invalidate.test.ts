import { findPathsToInvalidate } from '@navno-app/lib/cache/find-paths-to-invalidate';

const ROOT_REPO = 'com.enonic.cms.default';

let contextRepo: string | undefined;

jest.mock('@navno-app/lib/context/run-in-context', () => ({
    runInContext: jest.fn(({ repository }, func) => {
        const previousRepo = contextRepo;
        contextRepo = repository;
        try {
            return func();
        } finally {
            contextRepo = previousRepo;
        }
    }),
}));

// Mirrors XP8, where contentLib.get throws when the context has no repository
jest.mock('@navno-app/lib/paths/custom-paths/custom-path-utils', () => ({
    getCustomPathFromContent: jest.fn((_contentId: string, versionId?: string) => {
        if (contextRepo !== ROOT_REPO) {
            throw new Error('Error getting node');
        }
        return versionId ? '/old-custom-path' : '/new-custom-path';
    }),
}));

jest.mock('@navno-app/lib/utils/version-utils', () => ({
    getNodeVersions: () => [
        { nodeId: 'content-id', versionId: 'current', nodePath: '/www.nav.no/side' },
        { nodeId: 'content-id', versionId: 'previous', nodePath: '/www.nav.no/side' },
    ],
}));

jest.mock('@navno-app/lib/localization/layers-repo-utils/get-content-from-all-layers', () => ({
    getContentFromAllLayers: () => [
        {
            repoId: ROOT_REPO,
            locale: 'no',
            content: { _id: 'content-id', _path: '/www.nav.no/side' },
        },
    ],
}));

jest.mock('@navno-app/lib/cache/utils', () => ({ isPublicRenderedType: () => true }));
jest.mock('@navno-app/lib/paths/public-path', () => ({ getPublicPath: () => '/new-custom-path' }));
jest.mock('@navno-app/lib/localization/layers-data', () => ({
    getLayersData: () => ({
        locales: ['no'],
        defaultLocale: 'no',
        localeToRepoIdMap: { no: ROOT_REPO },
        repoIdToLocaleMap: { [ROOT_REPO]: 'no' },
    }),
}));
jest.mock('@navno-app/lib/reference-search/references-finder', () => ({
    ReferencesFinder: jest.fn().mockImplementation(() => ({ run: () => [] })),
}));

describe('findPathsToInvalidate', () => {
    it('includes changed custom paths when the caller has no repository in its context', () => {
        contextRepo = undefined;

        const paths = findPathsToInvalidate(
            { id: 'content-id', repo: ROOT_REPO, branch: 'master', path: '' } as any,
            'node.pushed'
        );

        expect(paths).toEqual(['/side', '/new-custom-path', '/old-custom-path']);
    });
});
