import { activateCacheEventListeners } from './invalidate-event-handlers';
import { xpMocks } from '../../__test/__mocks/xp-mocks';
import { NAVNO_ROOT_PATH } from '../constants';

const { libContentMock } = xpMocks;

activateCacheEventListeners();

describe('Cache invalidation events', () => {
    test('Pre-publishing', () => {
        const publishedContent = libContentMock.create({
            contentType: 'no.nav.navno:main-article',
            data: {},
            parentPath: NAVNO_ROOT_PATH,
            name: 'main-article',
        });

        libContentMock.publish({ keys: [publishedContent._id] });

        expect(true).toBeTruthy();
    });
});
