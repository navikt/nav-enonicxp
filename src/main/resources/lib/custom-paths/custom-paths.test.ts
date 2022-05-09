import { hasInvalidCustomPath, hasValidCustomPath } from './custom-paths';
import { Content } from '/lib/xp/content';

// jest.mock('/lib/xp/content', () => {
//     return {};
// });

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
    data: { ...contentWithoutCustomPath.data, customPath: '/test-custom-path' },
};

const contentWithInvalidCustomPath = {
    ...contentWithoutCustomPath,
    data: { ...contentWithoutCustomPath.data, customPath: '/test-custom-path' },
};

describe('Custom paths', () => {
    test('Custom paths should validate correctly', () => {
        expect(hasValidCustomPath(contentWithValidCustomPath)).toEqual(true);
        expect(hasInvalidCustomPath(contentWithInvalidCustomPath)).toEqual(false);

        expect(hasValidCustomPath(contentWithValidCustomPath)).toEqual(false);
        expect(hasInvalidCustomPath(contentWithInvalidCustomPath)).toEqual(true);
    });
});
