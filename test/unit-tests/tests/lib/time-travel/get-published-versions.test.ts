import {
    getVersionsForExternalArchive,
    VersionReferenceEnriched,
} from '@navno-app/lib/time-travel/get-published-versions';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR_MS).toISOString();

// Newest first, as getAllVersions returns them. modifiedTime is the time of the last edit. It does
// not change when content is published, scheduled or unpublished
const createVersion = ({
    versionId,
    savedAt,
    publishFrom,
    modifiedTime = savedAt,
}: {
    versionId: string;
    savedAt: string;
    publishFrom?: string;
    modifiedTime?: string;
}) =>
    ({
        versionId,
        nodeId: 'content-id',
        nodePath: '/content/www.nav.no/side',
        timestamp: savedAt,
        commitId: `commit-${versionId}`,
        locale: 'no',
        displayName: 'Side',
        modifiedTime,
        type: 'no.nav.navno:dynamic-page',
        publishFromTime: publishFrom,
        // As enrichVersionReference sets it: unpublishing removes publish.from
        excludeFromExternalArchive: publishFrom ? undefined : true,
    }) as VersionReferenceEnriched;

const getVersionIds = (versions: VersionReferenceEnriched[]) =>
    getVersionsForExternalArchive(versions).map((version) => version.versionId);

describe('getVersionsForExternalArchive', () => {
    test('leaves out versions scheduled for publishing', () => {
        const versions = [
            createVersion({
                versionId: 'scheduled',
                savedAt: daysFromNow(0),
                publishFrom: daysFromNow(1),
            }),
            createVersion({
                versionId: 'published-2',
                savedAt: daysFromNow(-5),
                publishFrom: daysFromNow(-30),
            }),
            createVersion({
                versionId: 'published-1',
                savedAt: daysFromNow(-30),
                publishFrom: daysFromNow(-30),
            }),
        ];

        expect(getVersionIds(versions)).toEqual(['published-2', 'published-1']);
    });

    test('keeps versions which were scheduled, once they are published', () => {
        const versions = [
            createVersion({
                versionId: 'was-scheduled',
                savedAt: daysFromNow(-3),
                publishFrom: daysFromNow(-1),
            }),
            createVersion({
                versionId: 'published',
                savedAt: daysFromNow(-30),
                publishFrom: daysFromNow(-30),
            }),
        ];

        expect(getVersionIds(versions)).toEqual(['was-scheduled', 'published']);
    });

    // Published, unpublished, edited, scheduled, unpublished before the scheduled time, and then
    // published again without new edits. The cancelled and the republished version have the same
    // modifiedTime
    const createRescheduledVersions = (cancelledPublishFrom: string) => {
        const originalEdit = daysFromNow(-1);
        const newEdit = hoursFromNow(-5);

        return [
            createVersion({
                versionId: 'republished',
                savedAt: hoursFromNow(-1),
                publishFrom: hoursFromNow(-0.5),
                modifiedTime: newEdit,
            }),
            createVersion({
                versionId: 'unpublished-2',
                savedAt: hoursFromNow(-2),
                modifiedTime: newEdit,
            }),
            createVersion({
                versionId: 'cancelled',
                savedAt: hoursFromNow(-4),
                publishFrom: cancelledPublishFrom,
                modifiedTime: newEdit,
            }),
            createVersion({
                versionId: 'unpublished-1',
                savedAt: hoursFromNow(-6),
                modifiedTime: originalEdit,
            }),
            createVersion({
                versionId: 'original',
                savedAt: originalEdit,
                publishFrom: originalEdit,
                modifiedTime: originalEdit,
            }),
        ];
    };

    test('shows content republished after a cancelled schedule', () => {
        expect(getVersionIds(createRescheduledVersions(hoursFromNow(2)))).toEqual([
            'republished',
            'original',
        ]);
    });

    test('never shows a cancelled schedule, also after its publish time has passed', () => {
        expect(getVersionIds(createRescheduledVersions(hoursFromNow(-1.5)))).toEqual([
            'republished',
            'original',
        ]);
    });

    test('shows a scheduled version which was public before the content was unpublished', () => {
        const versions = [
            createVersion({ versionId: 'unpublished', savedAt: hoursFromNow(-1) }),
            createVersion({
                versionId: 'scheduled',
                savedAt: hoursFromNow(-5),
                publishFrom: hoursFromNow(-3),
            }),
        ];

        expect(getVersionIds(versions)).toEqual(['scheduled']);
    });
});
