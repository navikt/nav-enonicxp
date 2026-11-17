const mockQuery = jest.fn();
const mockContentGet = jest.fn();
const mockModify = jest.fn();
const mockPush = jest.fn();
const mockDraftGet = jest.fn();

let currentBranch = 'draft';
let isInsideEditor = false;
let contextSwitchesInsideEditor = 0;

jest.mock(
    '/lib/xp/content',
    () => ({
        query: mockQuery,
        get: ({ key }: { key: string }) => mockContentGet(currentBranch, key),
    }),
    { virtual: true }
);
jest.mock('/lib/xp/event', () => ({ listener: jest.fn() }), { virtual: true });

jest.mock('@navno-app/lib/context/run-in-context', () => ({
    getContextRepoId: () => 'com.enonic.cms.default',
    runInContext: ({ branch }: { branch?: string }, callback: () => unknown) => {
        if (isInsideEditor) {
            contextSwitchesInsideEditor++;
        }
        const previousBranch = currentBranch;
        currentBranch = branch || currentBranch;
        try {
            return callback();
        } finally {
            currentBranch = previousBranch;
        }
    },
}));
jest.mock('@navno-app/lib/repos/repo-utils', () => ({
    isDraftAndMasterSameVersion: () => true,
    getRepoConnection: () => ({
        get: mockDraftGet,
        modify: mockModify,
        commit: jest.fn(),
        push: mockPush,
    }),
}));
jest.mock('@navno-app/lib/utils/content-utils', () => ({
    isContentAwaitingPrepublish: () => false,
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock('@navno-app/lib/cluster-utils/main-datanode', () => ({ isMainDatanode: jest.fn() }));
jest.mock('@navno-app/lib/constants', () => ({ CONTENT_REPO_PREFIX: 'com.enonic.cms' }));

import { removeUnpublishedFromAllContentLists } from '@navno-app/lib/contentlists/remove-unpublished';

// Stands in for XP's Reference values, which must be written back with the same type
class Reference {
    constructor(private readonly id: string) {}
    toString() {
        return this.id;
    }
}

const contentList = { _id: 'list-id', _path: '/www.nav.no/liste' };

const runModifyEditor = (data: Record<string, unknown>) => {
    const { editor } = mockModify.mock.calls[0][0];
    isInsideEditor = true;
    try {
        return editor({ _id: contentList._id, data });
    } finally {
        isInsideEditor = false;
    }
};

describe('removeUnpublishedFromAllContentLists', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockModify.mockReset();
        contextSwitchesInsideEditor = 0;
        mockQuery.mockReturnValue({ hits: [contentList] });
        mockContentGet.mockImplementation((branch: string, key: string) =>
            branch === 'master' && key === 'published-id' ? { _id: key } : null
        );
    });

    test('removes unpublished items without switching context inside the editor', () => {
        const published = new Reference('published-id');
        const unpublished = new Reference('unpublished-id');
        mockDraftGet.mockReturnValue({ data: { sectionContents: [published, unpublished] } });

        const result = removeUnpublishedFromAllContentLists();

        const edited = runModifyEditor({ sectionContents: [published, unpublished] });
        expect(edited.data.sectionContents).toEqual([published]);
        expect(edited.data.sectionContents[0]).toBe(published);
        expect(contextSwitchesInsideEditor).toBe(0);
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            contentListsChecked: 1,
            itemsRemoved: 1,
            changedContentLists: [contentList._path],
            failedContentLists: [],
        });
    });

    test('does not modify content lists with only published items', () => {
        mockDraftGet.mockReturnValue({ data: { sectionContents: ['published-id'] } });

        const result = removeUnpublishedFromAllContentLists();

        expect(mockModify).not.toHaveBeenCalled();
        expect(result.itemsRemoved).toBe(0);
        expect(result.changedContentLists).toEqual([]);
    });

    test('reports content lists that fail to update', () => {
        mockDraftGet.mockReturnValue({ data: { sectionContents: ['unpublished-id'] } });
        mockModify.mockImplementation(() => {
            throw new Error('Access denied');
        });

        const result = removeUnpublishedFromAllContentLists();

        expect(result.failedContentLists).toEqual([
            { path: contentList._path, error: 'Error: Access denied' },
        ]);
        expect(result.itemsRemoved).toBe(0);
    });
});
