type NodeHit = { id: string; repoId: string; branch: string };

const nodeHits: NodeHit[] = [];
const contents: Record<string, Record<string, unknown>> = {};
const lastPublishedVersions: Record<string, Record<string, unknown>> = {};
const warning = jest.fn();

const getNodeHitsFromExternalArchiveQuery = jest.fn(() => nodeHits);
const getRepoConnection = jest.fn(() => ({ get: (id: string) => contents[id] ?? null }));
const getLastPublishedContentVersion = jest.fn((id: string) => lastPublishedVersions[id] ?? null);

jest.mock('@navno-app/services/dataQuery/utils/queryBuilder', () => ({
    getNodeHitsFromQuery: jest.fn(),
    getNodeHitsFromExternalArchiveQuery,
}));
jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection }));
jest.mock('@navno-app/lib/external-archive/get-content', () => ({
    getLastPublishedContentVersion,
}));
jest.mock('@navno-app/lib/paths/public-path', () => ({ getPublicPath: () => '/side' }));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { info: jest.fn(), warning, error: jest.fn(), critical: jest.fn() },
}));

import { runExternalArchiveQuery } from '@navno-app/services/dataQuery/utils/queryRunners';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const createContent = (id: string, displayName: string, publishFrom: string) => ({
    _id: id,
    _path: `/content/www.nav.no/${id}`,
    displayName,
    type: 'no.nav.navno:dynamic-page',
    data: {},
    publish: { from: publishFrom },
});

const addHit = (id: string, publishFrom?: string) => {
    nodeHits.push({ id, repoId: 'repo', branch: 'master' });
    if (publishFrom) {
        contents[id] = createContent(id, id, publishFrom);
    }
};

// Node hits are cached per request id
let requestCount = 0;
const runSearch = () =>
    runExternalArchiveQuery({ requestId: `test-${requestCount++}`, query: 'side', types: [] });

describe('runExternalArchiveQuery', () => {
    beforeEach(() => {
        nodeHits.length = 0;
        [contents, lastPublishedVersions].forEach((map) =>
            Object.keys(map).forEach((id) => delete map[id])
        );
    });

    test('leaves out content scheduled for its first publishing', () => {
        addHit('published', daysFromNow(-10));
        addHit('scheduled', daysFromNow(1));

        const result = runSearch();

        expect(result.hits.map((hit) => hit._id)).toEqual(['published']);
        expect(result.total).toBe(1);
        expect(warning).not.toHaveBeenCalled();
    });

    test('shows the last published version of content scheduled to be published again', () => {
        addHit('rescheduled', daysFromNow(1));
        lastPublishedVersions['rescheduled'] = createContent(
            'rescheduled',
            'Published title',
            daysFromNow(-10)
        );

        const result = runSearch();

        expect(getLastPublishedContentVersion.mock.calls[0][0]).toBe('rescheduled');
        expect(result.hits.map((hit) => hit.displayName)).toEqual(['Published title']);
        expect(result.total).toBe(1);
        expect(warning).not.toHaveBeenCalled();
    });

    test('does not look up older versions for published content', () => {
        addHit('published', daysFromNow(-10));

        runSearch();

        expect(getLastPublishedContentVersion).not.toHaveBeenCalled();
    });

    test('still warns about hits without content', () => {
        addHit('published', daysFromNow(-10));
        addHit('missing');

        const result = runSearch();

        expect(result.total).toBe(1);
        expect(warning).toHaveBeenCalledTimes(1);
    });
});
