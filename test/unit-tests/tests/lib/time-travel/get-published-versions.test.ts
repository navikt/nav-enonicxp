import {
    getVersionsForExternalArchive,
    VersionReferenceEnriched,
} from '@navno-app/lib/time-travel/get-published-versions';

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

type TestVersion = {
    versionId: string;
    savedAt: string;
    publishFrom?: string;
    unpublishedTime?: string;
    modifiedTime?: string;
};

// As externalArchive/content passes them: newest first, with unpublishedTime set when the newer
// version unpublished the content. modifiedTime only changes when the content is edited
const getVersionIds = (versions: TestVersion[]) =>
    getVersionsForExternalArchive(
        versions.map(
            ({ versionId, savedAt, publishFrom, unpublishedTime, modifiedTime = savedAt }) =>
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
                    unpublishedTime,
                    // As enrichVersionReference sets it, since unpublishing removes publish.from
                    excludeFromExternalArchive: publishFrom ? undefined : true,
                }) as VersionReferenceEnriched & { unpublishedTime?: string }
        )
    ).map((version) => version.versionId);

const published = {
    versionId: 'published',
    savedAt: '2024-03-01T14:42:46Z',
    publishFrom: '2024-03-01T15:00:00Z',
};

describe('getVersionsForExternalArchive', () => {
    test('leaves out a version scheduled for publishing', () => {
        expect(
            getVersionIds([
                {
                    versionId: 'scheduled',
                    savedAt: '2024-03-02T10:00:00Z',
                    publishFrom: inOneHour(),
                },
                published,
            ])
        ).toEqual(['published']);
    });

    test('keeps a scheduled version once it is published', () => {
        expect(
            getVersionIds([
                {
                    versionId: 'was-scheduled',
                    savedAt: '2024-03-02T10:00:00Z',
                    publishFrom: '2024-03-02T15:00:00Z',
                },
                published,
            ])
        ).toEqual(['was-scheduled', 'published']);
    });

    // Tested in dev 28.10: published, unpublished, edited, scheduled for 15:00, unpublished before
    // 15:00, and published again at 14:05 without new edits. Publishing and unpublishing do not
    // change modifiedTime, so the three newest versions have the same modifiedTime
    test.each([
        ['before', inOneHour()],
        ['after', '2024-03-02T15:00:00Z'],
    ])(
        'shows content published again after a cancelled schedule, %s the cancelled publish time',
        (_, cancelledPublishFrom) => {
            const edited = '2024-03-02T10:44:11Z';

            expect(
                getVersionIds([
                    {
                        versionId: 'published-again',
                        savedAt: '2024-03-02T14:04:01Z',
                        publishFrom: '2024-03-02T14:05:00Z',
                        modifiedTime: edited,
                    },
                    {
                        versionId: 'unpublished-2',
                        savedAt: '2024-03-02T14:01:56Z',
                        modifiedTime: edited,
                    },
                    {
                        versionId: 'cancelled',
                        savedAt: '2024-03-02T10:45:06Z',
                        publishFrom: cancelledPublishFrom,
                        unpublishedTime: '2024-03-02T14:01:56Z',
                        modifiedTime: edited,
                    },
                    {
                        versionId: 'unpublished-1',
                        savedAt: '2024-03-02T10:43:17Z',
                        modifiedTime: '2024-03-01T14:41:56Z',
                    },
                    {
                        ...published,
                        unpublishedTime: '2024-03-02T10:43:17Z',
                        modifiedTime: '2024-03-01T14:41:56Z',
                    },
                ])
            ).toEqual(['published-again', 'published']);
        }
    );
});
