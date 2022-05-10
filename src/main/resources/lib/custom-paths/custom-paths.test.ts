import { getCustomPathFromContent, hasInvalidCustomPath, hasValidCustomPath } from './custom-paths';
import contentLib, { Content } from '/lib/xp/content';
import { mockReturnValue } from '../../_test/utils/mock-utils';

jest.mock('/lib/xp/content');

const contentWithoutCustomPath: Content = {
    _id: 'bfb67caa-c149-4302-bdb6-09f2ee0c3649',
    _name: 'test-side',
    _path: '/www.nav.no/test-side',
    creator: 'user:system:su',
    modifier: 'user:system:su',
    createdTime: '2022-05-09T10:44:58.676477300Z',
    modifiedTime: '2022-05-09T10:45:26.228985500Z',
    owner: 'user:system:su',
    type: 'no.nav.navno:dynamic-page',
    displayName: 'Test-side',
    hasChildren: false,
    language: 'no',
    valid: true,
    childOrder: 'modifiedtime DESC',
    data: {
        chatbotToggle: true,
        feedbackToggle: false,
        noindex: false,
    },
    x: {
        'no-nav-navno': {
            virtualParent: {},
            fasetter: {},
        },
    },
    page: {},
    attachments: {},
    publish: {
        from: '2022-05-09T10:45:26.046973700Z',
        first: '2022-05-09T10:45:26.046973700Z',
    },
    workflow: {
        state: 'READY',
        checks: {},
    },
};

const contentWithValidCustomPath = {
    ...contentWithoutCustomPath,
    data: { ...contentWithoutCustomPath.data, customPath: '/test-valid-path' },
};

const contentWithInvalidCustomPath = {
    ...contentWithoutCustomPath,
    data: { ...contentWithoutCustomPath.data, customPath: 'test-invalid-path' },
};

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
        mockReturnValue(contentLib.get, contentWithValidCustomPath);
        expect(getCustomPathFromContent('someId')).toBe(contentWithValidCustomPath.data.customPath);
    });

    test('Should return null if no valid customPath', () => {
        mockReturnValue(contentLib.get, contentWithInvalidCustomPath);
        expect(getCustomPathFromContent('someId')).toBeNull();

        mockReturnValue(contentLib.get, contentWithoutCustomPath);
        expect(getCustomPathFromContent('someId')).toBeNull();
    });
});
