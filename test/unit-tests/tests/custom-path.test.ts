import { xpMocks } from '../.mocks/xp-mocks';
import {
    getCustomPathFromContent,
    hasInvalidCustomPath,
    hasValidCustomPath,
} from '@navno-app/lib/paths/custom-paths/custom-path-utils';

const { libContentMock } = xpMocks;

const contentWithValidCustomPath = libContentMock.create({
    contentType: 'no.nav.navno:dynamic-page',
    data: { customPath: '/valid-path' },
    name: 'content-with-valid-customPath',
    parentPath: '/',
});

const contentWithInvalidCustomPath = libContentMock.create({
    contentType: 'no.nav.navno:dynamic-page',
    data: { customPath: 'invalid-path' },
    name: 'content-with-invalid-customPath',
    parentPath: '/',
});

const contentWithoutCustomPath = libContentMock.create({
    contentType: 'no.nav.navno:dynamic-page',
    data: {},
    name: 'content-without-customPath',
    parentPath: '/',
});

describe('Custom paths', () => {
    test('Content with valid custompath should be valid', () => {
        expect(hasValidCustomPath(contentWithValidCustomPath)).toBe(true);
    });

    test('Content with invalid custompath should not be valid', () => {
        expect(hasValidCustomPath(contentWithInvalidCustomPath)).toBe(false);
    });

    test('Content with valid custompath should not be invalid', () => {
        expect(hasInvalidCustomPath(contentWithValidCustomPath)).toBe(false);
    });

    test('Content with invalid custompath should be invalid', () => {
        expect(hasInvalidCustomPath(contentWithInvalidCustomPath)).toBe(true);
    });

    test('Content with no custom path should be neither valid nor invalid', () => {
        expect(hasValidCustomPath(contentWithoutCustomPath)).toBe(false);
        expect(hasInvalidCustomPath(contentWithoutCustomPath)).toBe(false);
    });

    test('Should return customPath if it is valid', () => {
        expect(getCustomPathFromContent('/content-with-valid-customPath')).toBe('/valid-path');
    });

    test('Should return null if no valid customPath', () => {
        expect(getCustomPathFromContent('/content-with-invalid-customPath')).toBeNull();
        expect(getCustomPathFromContent('/content-without-customPath')).toBeNull();
    });
});
