import * as contentLib from '/lib/xp/content';
import { determineLastPublished } from '@navno-app/lib/guillotine/schema/schema-creation-callbacks/general-data-callback';

const partialContent = {
    type: 'no.nav.navno:dynamic-page',
    publish: {
        from: '2025-06-01T10:00:00.000Z',
        first: '2025-05-25T13:33:00.000Z',
    },
    _ts: '2025-05-25T13:33:00.000Z',
} as any;

describe('Test of determineLastPublished', () => {
    test('Should use publish.from when this is the latest date.', () => {
        partialContent.publish.from = '2025-06-01T10:00:00.000Z';
        const lastPublished = determineLastPublished(partialContent as any);

        expect(lastPublished).toBe('2025-06-01T10:00:00.000Z');
    });
    test('Should use _ts when this is the latest date.', () => {
        partialContent._ts = '2025-07-01T12:00:00.000Z';
        const lastPublished = determineLastPublished(partialContent as any);

        expect(lastPublished).toBe('2025-07-01T12:00:00.000Z');
    });
});
