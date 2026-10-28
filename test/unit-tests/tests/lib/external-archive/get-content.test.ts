type TestNode = {
    _id: string;
    _path: string;
    _versionKey: string;
    type: string;
    displayName: string;
    data: Record<string, unknown>;
    publish: { from: string; first: string };
};

type TestVersion = {
    versionId: string;
    nodeId: string;
    nodePath: string;
    timestamp: string;
    commitId?: string;
};

type GetParams = string | { key: string; versionId?: string };

const masterNodes: Record<string, TestNode> = {};
const draftNodes: Record<string, TestNode> = {};
const versionNodes: Record<string, TestNode> = {};
const draftVersions: Record<string, TestVersion[]> = {};

// Only what get-content.ts uses. mock-xp does not implement findVersions
const getRepoConnection = jest.fn(({ branch }: { branch: string }) => ({
    get: (params: GetParams) => {
        const { key, versionId } = typeof params === 'string' ? { key: params } : params;
        if (versionId) {
            return versionNodes[versionId] ?? null;
        }

        return (branch === 'master' ? masterNodes[key] : draftNodes[key]) ?? null;
    },
    findVersions: ({ key }: { key: string }) => {
        const hits = draftVersions[key] ?? [];
        return { hits, total: hits.length, count: hits.length };
    },
}));

jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection }));

import {
    getContentForExternalArchive,
    getLastPublishedContentVersion,
} from '@navno-app/lib/external-archive/get-content';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

// Versions newest first. All are committed, i.e. published or scheduled for publishing
const addContent = (
    contentId: string,
    versions: { versionId: string; publishFrom: string }[],
    versionInMaster: string
) => {
    const nodes = versions.map(({ versionId, publishFrom }) => ({
        _id: contentId,
        _path: `/content/www.nav.no/${contentId}`,
        _versionKey: versionId,
        type: 'no.nav.navno:dynamic-page',
        displayName: contentId,
        data: {},
        publish: { from: publishFrom, first: publishFrom },
    }));

    nodes.forEach((node) => {
        versionNodes[node._versionKey] = node;
    });
    draftNodes[contentId] = nodes[0];
    masterNodes[contentId] = versionNodes[versionInMaster];
    draftVersions[contentId] = nodes.map((node) => ({
        versionId: node._versionKey,
        nodeId: contentId,
        nodePath: node._path,
        timestamp: node.publish.from,
        commitId: `commit-${node._versionKey}`,
    }));
};

addContent(
    'published',
    [{ versionId: 'published-1', publishFrom: daysFromNow(-10) }],
    'published-1'
);

// New content, scheduled to be published tomorrow
addContent('scheduled', [{ versionId: 'scheduled-1', publishFrom: daysFromNow(1) }], 'scheduled-1');

// Was published, then unpublished, and is now scheduled to be published again
addContent(
    'rescheduled',
    [
        { versionId: 'rescheduled-2', publishFrom: daysFromNow(1) },
        { versionId: 'rescheduled-1', publishFrom: daysFromNow(-30) },
    ],
    'rescheduled-2'
);

describe('getLastPublishedContentVersion', () => {
    test('returns published content', () => {
        expect(getLastPublishedContentVersion('published', 'no')?._versionKey).toBe('published-1');
    });

    test('returns nothing for content scheduled for its first publishing', () => {
        expect(getLastPublishedContentVersion('scheduled', 'no')).toBeNull();
    });

    test('returns the last version which was published, for content scheduled again', () => {
        expect(getLastPublishedContentVersion('rescheduled', 'no')?._versionKey).toBe(
            'rescheduled-1'
        );
    });
});

describe('getContentForExternalArchive', () => {
    test('does not return a version scheduled for publishing', () => {
        expect(
            getContentForExternalArchive({
                contentId: 'scheduled',
                versionId: 'scheduled-1',
                locale: 'no',
            }).content
        ).toBeNull();
    });

    test('does not return content scheduled for publishing, without a version', () => {
        expect(
            getContentForExternalArchive({ contentId: 'scheduled', locale: 'no' }).content
        ).toBeNull();
    });

    test('returns a version which was published', () => {
        expect(
            getContentForExternalArchive({
                contentId: 'rescheduled',
                versionId: 'rescheduled-1',
                locale: 'no',
            }).content?._versionKey
        ).toBe('rescheduled-1');
    });
});
