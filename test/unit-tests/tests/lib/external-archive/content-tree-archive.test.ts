type TestNode = {
    _id: string;
    _path: string;
    _name: string;
    displayName: string;
    type: string;
    originalParentPath?: string;
    originalName?: string;
    publish: { first?: string };
};

const nodes: Record<string, TestNode> = {};
const childIds: Record<string, string[]> = {};
const archivedIds: string[] = [];

// Only what the archive tree uses. Queries with a count return the archived content
const getRepoConnection = jest.fn(() => ({
    get: (id: string) => nodes[id] ?? null,
    query: ({ count }: { count: number }) => {
        const hits = count ? archivedIds.map((id) => ({ id })) : [];
        return { hits, total: hits.length, count: hits.length };
    },
    findChildren: ({ parentKey }: { parentKey: string }) => {
        const hits = (childIds[parentKey] ?? []).map((id) => ({ id }));
        return { hits, total: hits.length, count: hits.length };
    },
}));

jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection }));
jest.mock('@navno-app/lib/utils/uuid', () => ({ generateUUID: () => 'uuid' }));

import {
    ArchiveContentTrees,
    refreshArchiveContentTrees,
} from '@navno-app/lib/external-archive/content-tree-archive';

const addNode = (node: TestNode, parentId: string) => {
    nodes[node._id] = node;
    childIds[parentId] = [...(childIds[parentId] ?? []), node._id];
};

// Archived page, with one child which was published and one which never was
nodes['archived'] = {
    _id: 'archived',
    _path: '/archive/side',
    _name: 'side',
    displayName: 'Side',
    type: 'no.nav.navno:dynamic-page',
    originalParentPath: '/www.nav.no/no/person',
    originalName: 'side',
    publish: { first: '2024-03-01T10:00:00Z' },
};
archivedIds.push('archived');

addNode(
    {
        _id: 'published-child',
        _path: '/archive/side/publisert',
        _name: 'publisert',
        displayName: 'Publisert',
        type: 'no.nav.navno:dynamic-page',
        publish: { first: '2024-03-01T10:00:00Z' },
    },
    'archived'
);

addNode(
    {
        _id: 'unpublished-child',
        _path: '/archive/side/aldri-publisert',
        _name: 'aldri-publisert',
        displayName: 'Aldri publisert',
        type: 'no.nav.navno:dynamic-page',
        publish: {},
    },
    'archived'
);

refreshArchiveContentTrees();

describe('ArchiveContentTrees', () => {
    test('includes children of archived content which were published', () => {
        expect(
            ArchiveContentTrees.no.getContentTreeEntry('/no/person/side/publisert')?.content.id
        ).toBe('published-child');
    });

    test('leaves out children of archived content which were never published', () => {
        expect(
            ArchiveContentTrees.no.getContentTreeEntry('/no/person/side/aldri-publisert')
        ).toBeNull();
        expect(
            ArchiveContentTrees.no.getContentTreeEntry('/no/person/side')?.content.numChildren
        ).toBe(1);
    });
});
