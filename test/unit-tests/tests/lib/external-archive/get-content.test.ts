type TestNode = {
    _id: string;
    _path: string;
    _versionKey: string;
    type: string;
    displayName: string;
    data: Record<string, unknown>;
    publish: { from?: string; first?: string };
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
const commitTimes: Record<string, string> = {};

// Only what get-content.ts uses. mock-xp does not implement findVersions or getCommit
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
    getCommit: ({ id }: { id: string }) =>
        commitTimes[id] ? { id, timestamp: commitTimes[id] } : null,
}));

jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection }));

import {
    getContentForExternalArchive,
    getLastPublishedContentVersion,
} from '@navno-app/lib/external-archive/get-content';

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

// Versions newest first. Unpublishing removes publish.from. A version is committed when it is
// saved, unless committedAt is set, or draftOnly when it was never published or unpublished
const addContent = (
    contentId: string,
    versions: {
        versionId: string;
        savedAt: string;
        committedAt?: string;
        draftOnly?: boolean;
        publishFrom?: string;
    }[],
    versionInMaster: string
) => {
    const nodes = versions.map(({ versionId, publishFrom }) => ({
        _id: contentId,
        _path: `/content/www.nav.no/${contentId}`,
        _versionKey: versionId,
        type: 'no.nav.navno:dynamic-page',
        displayName: contentId,
        data: {},
        publish: publishFrom ? { from: publishFrom, first: publishFrom } : {},
    }));

    nodes.forEach((node) => {
        versionNodes[node._versionKey] = node;
    });
    draftNodes[contentId] = nodes[0];
    masterNodes[contentId] = versionNodes[versionInMaster];
    draftVersions[contentId] = versions.map(
        ({ versionId, savedAt, committedAt = savedAt, draftOnly }) => {
            if (!draftOnly) {
                commitTimes[`commit-${versionId}`] = committedAt;
            }

            return {
                versionId,
                nodeId: contentId,
                nodePath: `/content/www.nav.no/${contentId}`,
                timestamp: savedAt,
                commitId: draftOnly ? undefined : `commit-${versionId}`,
            };
        }
    );
};

addContent(
    'published',
    [
        {
            versionId: 'published-1',
            savedAt: '2024-03-01T10:00:00Z',
            publishFrom: '2024-03-01T10:00:00Z',
        },
    ],
    'published-1'
);

// New content, scheduled to be published tomorrow
addContent(
    'scheduled',
    [{ versionId: 'scheduled-1', savedAt: '2024-03-01T10:00:00Z', publishFrom: tomorrow() }],
    'scheduled-1'
);

// Published, unpublished, and scheduled to be published again tomorrow
addContent(
    'rescheduled',
    [
        { versionId: 'rescheduled-3', savedAt: '2024-03-03T10:00:00Z', publishFrom: tomorrow() },
        { versionId: 'rescheduled-2', savedAt: '2024-03-02T10:00:00Z' },
        {
            versionId: 'rescheduled-1',
            savedAt: '2024-03-01T10:00:00Z',
            publishFrom: '2024-03-01T10:00:00Z',
        },
    ],
    'rescheduled-3'
);

// Published, unpublished, scheduled for 15:00, unpublished at 14:00 before the publish time, and
// scheduled again for tomorrow
addContent(
    'cancelled',
    [
        { versionId: 'cancelled-5', savedAt: '2024-03-03T10:00:00Z', publishFrom: tomorrow() },
        { versionId: 'cancelled-4', savedAt: '2024-03-02T14:00:00Z' },
        {
            versionId: 'cancelled-3',
            savedAt: '2024-03-02T10:45:00Z',
            publishFrom: '2024-03-02T15:00:00Z',
        },
        { versionId: 'cancelled-2', savedAt: '2024-03-02T10:43:00Z' },
        {
            versionId: 'cancelled-1',
            savedAt: '2024-03-01T10:00:00Z',
            publishFrom: '2024-03-01T10:00:00Z',
        },
    ],
    'cancelled-5'
);

// New content, scheduled for 12:00. At 11:00, scheduled for tomorrow in Details > Schedule and
// published again
addContent(
    'moved',
    [
        { versionId: 'moved-2', savedAt: '2024-03-02T11:00:00Z', publishFrom: tomorrow() },
        {
            versionId: 'moved-1',
            savedAt: '2024-03-02T10:00:00Z',
            publishFrom: '2024-03-02T12:00:00Z',
        },
    ],
    'moved-2'
);

// As 'moved', but the new publish time was saved at 11:00 and published at 16:00. The first
// version was public from 12:00 to 16:00
addContent(
    'moved-after-publish',
    [
        {
            versionId: 'moved-after-publish-2',
            savedAt: '2024-03-02T11:00:00Z',
            committedAt: '2024-03-02T16:00:00Z',
            publishFrom: tomorrow(),
        },
        {
            versionId: 'moved-after-publish-1',
            savedAt: '2024-03-02T10:00:00Z',
            publishFrom: '2024-03-02T12:00:00Z',
        },
    ],
    'moved-after-publish-2'
);

// Published, edited without publishing, and scheduled for tomorrow. The edit was never public
addContent(
    'draft-only',
    [
        { versionId: 'draft-only-3', savedAt: '2024-03-03T10:00:00Z', publishFrom: tomorrow() },
        {
            versionId: 'draft-only-2',
            savedAt: '2024-03-02T10:00:00Z',
            draftOnly: true,
            publishFrom: '2024-03-01T10:00:00Z',
        },
        {
            versionId: 'draft-only-1',
            savedAt: '2024-03-01T10:00:00Z',
            publishFrom: '2024-03-01T10:00:00Z',
        },
    ],
    'draft-only-3'
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

    test('skips a schedule which was cancelled by unpublishing', () => {
        expect(getLastPublishedContentVersion('cancelled', 'no')?._versionKey).toBe('cancelled-1');
    });

    test('returns nothing for content whose publish time was moved to a later time', () => {
        expect(getLastPublishedContentVersion('moved', 'no')).toBeNull();
    });

    test('returns a scheduled version which was public before the publish time was moved', () => {
        expect(getLastPublishedContentVersion('moved-after-publish', 'no')?._versionKey).toBe(
            'moved-after-publish-1'
        );
    });

    test('skips versions which were never published or unpublished', () => {
        expect(getLastPublishedContentVersion('draft-only', 'no')?._versionKey).toBe(
            'draft-only-1'
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
