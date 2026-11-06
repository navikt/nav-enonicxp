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
import { getLayersData } from '@navno-app/lib/localization/layers-data';

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const createContent = (id: string, displayName: string, publishFrom: string) => ({
    _id: id,
    _path: `/content/www.nav.no/${id}`,
    displayName,
    type: 'no.nav.navno:dynamic-page',
    data: {},
    publish: { from: publishFrom },
});

const addHit = (id: string, publishFrom?: string) => {
    nodeHits.push({ id, repoId: getLayersData().localeToRepoIdMap.no, branch: 'master' });
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
        addHit('published', '2024-03-01T10:00:00Z');
        addHit('scheduled', tomorrow());

        const result = runSearch();

        expect(result.hits.map((hit) => hit._id)).toEqual(['published']);
        expect(result.total).toBe(1);
        expect(warning).not.toHaveBeenCalled();
    });

    test('shows the last published version of content scheduled to be published again', () => {
        addHit('rescheduled', tomorrow());
        lastPublishedVersions['rescheduled'] = createContent(
            'rescheduled',
            'Published title',
            '2024-03-01T10:00:00Z'
        );

        const result = runSearch();

        expect(getLastPublishedContentVersion).toHaveBeenCalledWith('rescheduled', 'no');
        expect(result.hits.map((hit) => hit.displayName)).toEqual(['Published title']);
        expect(result.total).toBe(1);
        expect(warning).not.toHaveBeenCalled();
    });

    test('does not look up older versions for published content', () => {
        addHit('published', '2024-03-01T10:00:00Z');

        runSearch();

        expect(getLastPublishedContentVersion).not.toHaveBeenCalled();
    });

    test('still warns about hits without content', () => {
        addHit('published', '2024-03-01T10:00:00Z');
        addHit('missing');

        const result = runSearch();

        expect(result.total).toBe(1);
        expect(warning).toHaveBeenCalledTimes(1);
    });
});
