import {
    getVersionsForExternalArchive,
    VersionReferenceEnriched,
} from '@navno-app/lib/time-travel/get-published-versions';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

// Newest first, as getAllVersions returns them
const createVersion = (versionId: string, savedDaysAgo: number, publishFrom: string) =>
    ({
        versionId,
        nodeId: 'content-id',
        nodePath: '/content/www.nav.no/side',
        timestamp: daysFromNow(-savedDaysAgo),
        commitId: `commit-${versionId}`,
        locale: 'no',
        displayName: 'Side',
        modifiedTime: daysFromNow(-savedDaysAgo),
        type: 'no.nav.navno:dynamic-page',
        publishFromTime: publishFrom,
    }) as VersionReferenceEnriched;

describe('getVersionsForExternalArchive', () => {
    test('leaves out versions scheduled for publishing', () => {
        const versions = [
            createVersion('scheduled', 0, daysFromNow(1)),
            createVersion('published-2', 5, daysFromNow(-30)),
            createVersion('published-1', 30, daysFromNow(-30)),
        ];

        expect(getVersionsForExternalArchive(versions).map((v) => v.versionId)).toEqual([
            'published-2',
            'published-1',
        ]);
    });

    test('keeps versions which were scheduled, once they are published', () => {
        const versions = [
            createVersion('was-scheduled', 3, daysFromNow(-1)),
            createVersion('published', 30, daysFromNow(-30)),
        ];

        expect(getVersionsForExternalArchive(versions).map((v) => v.versionId)).toEqual([
            'was-scheduled',
            'published',
        ]);
    });
});
