import { Content } from '/lib/xp/content';
import {
    isContentAwaitingPrepublish,
    isPublishFromInFuture,
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
