import { Content } from '/lib/xp/content';
import {
    isContentAwaitingPrepublish,
    isPublishFromInFuture,
    wasVersionPublic,
} from '@navno-app/lib/utils/content-utils';

const HOUR_MS = 60 * 60 * 1000;
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR_MS).toISOString();
const inOneHour = () => hoursFromNow(1);
const oneHourAgo = () => hoursFromNow(-1);

describe('isPublishFromInFuture', () => {
    test('is true when publish.from is in the future', () => {
        expect(isPublishFromInFuture(inOneHour())).toBe(true);
    });

    test('is false when publish.from has passed', () => {
        expect(isPublishFromInFuture(oneHourAgo())).toBe(false);
    });

    test('is false without publish.from', () => {
        expect(isPublishFromInFuture(undefined)).toBe(false);
        expect(isPublishFromInFuture(null)).toBe(false);
    });
});

describe('isContentAwaitingPrepublish', () => {
    test('checks publish.from on the content', () => {
        expect(isContentAwaitingPrepublish({ publish: { from: inOneHour() } } as Content)).toBe(
            true
        );
        expect(isContentAwaitingPrepublish({ publish: { from: oneHourAgo() } } as Content)).toBe(
            false
        );
        expect(isContentAwaitingPrepublish({} as Content)).toBe(false);
    });
});

describe('wasVersionPublic', () => {
    test('is true for a published version', () => {
        expect(
            wasVersionPublic({ timestamp: hoursFromNow(-5), publishFrom: hoursFromNow(-5) })
        ).toBe(true);
    });

    test('is false for an unpublished version or a version scheduled for later', () => {
        expect(wasVersionPublic({ timestamp: hoursFromNow(-5) })).toBe(false);
        expect(wasVersionPublic({ timestamp: hoursFromNow(-5), publishFrom: inOneHour() })).toBe(
            false
        );
    });

    test('is false when unpublished before the scheduled publish time', () => {
        expect(
            wasVersionPublic(
                { timestamp: hoursFromNow(-5), publishFrom: hoursFromNow(-2) },
                { timestamp: hoursFromNow(-3) }
            )
        ).toBe(false);
    });

    test('is true when unpublished after the scheduled publish time', () => {
        expect(
            wasVersionPublic(
                { timestamp: hoursFromNow(-5), publishFrom: hoursFromNow(-3) },
                { timestamp: hoursFromNow(-2) }
            )
        ).toBe(true);
    });

    test('is true when followed by a newer published version, since only unpublishing cancels', () => {
        expect(
            wasVersionPublic(
                { timestamp: hoursFromNow(-5), publishFrom: hoursFromNow(-2) },
                { timestamp: hoursFromNow(-3), publishFrom: hoursFromNow(-3) }
            )
        ).toBe(true);
    });

    test('handles timestamps with nanoseconds, as XP returns them', () => {
        const scheduled = {
            timestamp: '2020-03-10T09:45:06.123456789Z',
            publishFrom: '2020-03-10T14:00:00Z',
        };

        expect(wasVersionPublic(scheduled, { timestamp: '2020-03-10T13:59:59.987654321Z' })).toBe(
            false
        );
        expect(wasVersionPublic(scheduled, { timestamp: '2020-03-10T14:00:00.123456789Z' })).toBe(
            true
        );
    });
});
