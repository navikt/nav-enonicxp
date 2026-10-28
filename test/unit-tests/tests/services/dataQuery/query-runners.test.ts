type NodeHit = { id: string; repoId: string; branch: string };

const nodeHits: NodeHit[] = [];
const contents: Record<string, Record<string, unknown>> = {};
const warning = jest.fn();

const getNodeHitsFromExternalArchiveQuery = jest.fn(() => nodeHits);
const getRepoConnection = jest.fn(() => ({ get: (id: string) => contents[id] ?? null }));

jest.mock('@navno-app/services/dataQuery/utils/queryBuilder', () => ({
    getNodeHitsFromQuery: jest.fn(),
    getNodeHitsFromExternalArchiveQuery,
}));
jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection }));
jest.mock('@navno-app/lib/paths/public-path', () => ({ getPublicPath: () => '/side' }));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { info: jest.fn(), warning, error: jest.fn(), critical: jest.fn() },
}));

import { runExternalArchiveQuery } from '@navno-app/services/dataQuery/utils/queryRunners';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const addHit = (id: string, publishFrom?: string) => {
    nodeHits.push({ id, repoId: 'repo', branch: 'master' });
    if (publishFrom) {
        contents[id] = {
            _id: id,
            _path: `/content/www.nav.no/${id}`,
            displayName: id,
            type: 'no.nav.navno:dynamic-page',
            data: {},
            publish: { from: publishFrom },
        };
    }
};

// Node hits are cached per request id
let requestCount = 0;
const runSearch = () =>
    runExternalArchiveQuery({ requestId: `test-${requestCount++}`, query: 'side', types: [] });

describe('runExternalArchiveQuery', () => {
    beforeEach(() => {
        nodeHits.length = 0;
        Object.keys(contents).forEach((id) => delete contents[id]);
    });

    test('leaves out content scheduled for publishing', () => {
        addHit('published', daysFromNow(-10));
        addHit('scheduled', daysFromNow(1));

        const result = runSearch();

        expect(result.hits.map((hit) => hit._id)).toEqual(['published']);
        expect(result.total).toBe(1);
        expect(warning).not.toHaveBeenCalled();
    });

    test('still warns about hits without content', () => {
        addHit('published', daysFromNow(-10));
        addHit('missing');

        const result = runSearch();

        expect(result.total).toBe(1);
        expect(warning).toHaveBeenCalledTimes(1);
    });
});
