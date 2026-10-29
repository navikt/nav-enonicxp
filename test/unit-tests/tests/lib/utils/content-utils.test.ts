import { Content } from '/lib/xp/content';
import {
    isContentAwaitingPrepublish,
    isPublishFromInFuture,
    wasVersionPublic,
} from '@navno-app/lib/utils/content-utils';

const HOUR_MS = 60 * 60 * 1000;
const inOneHour = () => new Date(Date.now() + HOUR_MS).toISOString();
const oneHourAgo = () => new Date(Date.now() - HOUR_MS).toISOString();

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
    test('is true when the publish time has passed', () => {
        expect(wasVersionPublic('2024-03-01T14:00:00Z')).toBe(true);
    });

    test('is false without a publish time, or when it is in the future', () => {
        expect(wasVersionPublic(undefined)).toBe(false);
        expect(wasVersionPublic(inOneHour())).toBe(false);
    });

    test('is false when the content was unpublished before the publish time', () => {
        expect(wasVersionPublic('2024-03-01T14:00:00Z', '2024-03-01T13:01:56.987654321Z')).toBe(
            false
        );
    });

    test('is true when the content was unpublished after the publish time', () => {
        expect(wasVersionPublic('2024-03-01T14:00:00Z', '2024-03-02T09:30:12.123456789Z')).toBe(
            true
        );
    });
});
