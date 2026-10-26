import { findTargetContentAndLocale } from '@navno-app/services/sitecontent/common/find-target-content-and-locale';

type TestContext = { repoId?: string; branch?: string };

let currentContext: TestContext = {};
const layerHits = jest.fn();
const queryContent = jest.fn();
const getContent = jest.fn();

// Like XP 8 outside a site mount: content calls fail unless a repository is set in the context.
const requireRepoContext = () => {
    if (!currentContext.repoId) {
        throw new Error('repositoryId is required');
    }
    return currentContext;
};

jest.mock('/lib/xp/content', () => ({
    query: (params: unknown) => queryContent(requireRepoContext(), params),
    get: (params: unknown) => getContent(requireRepoContext(), params),
}));
jest.mock('@navno-app/lib/localization/layers-data', () => ({
    getLayersData: () => ({
        defaultLocale: 'no',
        repoIdToLocaleMap: { 'com.enonic.cms.default': 'no' },
    }),
}));
jest.mock('@navno-app/lib/localization/locale-context', () => ({
    runInLocaleContext: ({ branch }: { branch?: string }, callback: () => unknown) => {
        const previousContext = currentContext;
        currentContext = { repoId: 'com.enonic.cms.default', branch: branch ?? 'master' };
        try {
            return callback();
        } finally {
            currentContext = previousContext;
        }
    },
}));
jest.mock('@navno-app/lib/localization/layers-repo-utils/layers-repo-connection', () => ({
    getLayersMultiConnection: () => ({ query: () => ({ hits: layerHits() }) }),
}));
jest.mock('@navno-app/lib/paths/locale-paths', () => ({
    resolveLocalePathToBasePath: () => null,
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { critical: jest.fn(), warning: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

describe('findTargetContentAndLocale', () => {
    beforeEach(() => {
        currentContext = {};
        jest.clearAllMocks();
    });

    it('resolves a path shared by several default project nodes without a repository context', () => {
        const page = { _id: 'page-id', type: 'no.nav.navno:situation-page' };
        layerHits.mockReturnValue([
            { id: 'folder-id', repoId: 'com.enonic.cms.default' },
            { id: 'page-id', repoId: 'com.enonic.cms.default' },
        ]);
        queryContent.mockReturnValue({ hits: [page] });
        getContent.mockReturnValue(page);

        const result = findTargetContentAndLocale({
            path: '/www.nav.no/arbeidsgiver',
            branch: 'draft',
        });

        expect(result).toEqual({ content: page, locale: 'no' });
        expect(queryContent).toHaveBeenCalledWith(
            { repoId: 'com.enonic.cms.default', branch: 'draft' },
            expect.objectContaining({
                filters: expect.objectContaining({ ids: { values: ['folder-id', 'page-id'] } }),
            })
        );
    });
});
