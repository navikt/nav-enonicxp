import { xpMocks } from '../../../__test/__mocks/xp-mocks';
import { SearchConfigV2 } from '@xp-types/site/content-types/search-config-v2';
import { buildExternalSearchDocument } from './document-builder';
import { ContentNode } from '../../../types/content-types/content-config';

const { libContentMock, libNodeMock, server } = xpMocks;

const searchConfigData: SearchConfigV2 = {
    defaultKeys: {
        titleKey: 'displayName',
        ingressKey: 'data.ingress',
        textKey: 'data.text',
    },
    contentGroups: [
        {
            name: 'Group 1',
            contentTypes: ['no.nav.navno:main-article'],
        },
        {
            name: 'Group 2',
            contentTypes: ['no.nav.navno:dynamic-page'],
            groupKeys: {
                titleKey: 'data.testTitle',
                ingressKey: 'data.testIngress',
                textKey: 'data.testText',
            },
        },
    ],
};

const searchConfig = libContentMock.create({
    contentType: 'no.nav.navno:search-config-v2',
    data: searchConfigData,
    name: 'search-config',
    parentPath: '/',
});

const mainArticle = libContentMock.create({
    contentType: 'no.nav.navno:main-article',
    data: {
        ingress: 'Main article ingress',
        text: 'Main article text',
    },
    name: 'article',
    parentPath: '/',
    displayName: 'Main article',
});

const dynamicPage = libContentMock.create({
    contentType: 'no.nav.navno:dynamic-page',
    data: {
        testTitle: 'Specified title field',
        testIngress: 'Specified ingress field',
        testText: 'Specified text field',
        customPath: '/foo',
    },
    name: 'dynamic-page',
    parentPath: '/',
    displayName: 'Dynamic page',
});

const contentList = libContentMock.create({
    contentType: 'no.nav.navno:content-list',
    data: {},
    name: 'content-list',
    parentPath: '/',
    displayName: 'Content list',
});

const prepublishedMainArticle = libContentMock.create({
    contentType: 'no.nav.navno:main-article',
    data: {},
    name: 'article-prepublished',
    parentPath: '/',
    displayName: 'Main article prepublished',
});

libContentMock.publish({
    keys: [mainArticle._id, dynamicPage._id, contentList._id, prepublishedMainArticle._id],
});

jest.mock('../config', () => {
    return {
        getExternalSearchConfig: jest.fn(() => searchConfig),
    };
});

jest.mock('../../localization/resolve-language-versions', () => ({
    getLanguageVersions: () => [],
}));

describe('Document builder for external search api', () => {
    const repoConnection = libNodeMock.connect({
        branch: 'master',
        repoId: server.context.repository,
    });

    test('Content types with a search config should generate a document', () => {
        const contentNode = repoConnection.get(mainArticle._id) as ContentNode;
        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument).toBeTruthy();
    });

    test('Content types without a search config should not generate a document', () => {
        const contentNode = repoConnection.get(contentList._id) as ContentNode;
        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument).toBeNull();
    });

    test('Should use the default fields if no fields were specified for the content group', () => {
        const contentNode = repoConnection.get(mainArticle._id) as ContentNode;
        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument?.title).toBe(contentNode.displayName);
        expect(searchDocument?.ingress).toBe(contentNode.data.ingress);
        expect(searchDocument?.text).toBe(contentNode.data.text);
    });

    test('Should use the specified fields for the content group', () => {
        const contentNode = repoConnection.get(dynamicPage._id) as ContentNode;
        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument?.title).toBe(contentNode.data.testTitle);
        expect(searchDocument?.ingress).toBe(contentNode.data.testIngress);
        expect(searchDocument?.text).toBe(contentNode.data.testText);
    });

    test('Should use custom path and no locale suffix for default language content', () => {
        const contentNode = repoConnection.get(dynamicPage._id) as ContentNode;
        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument?.href.endsWith(dynamicPage.data.customPath)).toBeTruthy();
    });

    test('Should use custom path with locale suffix for english language content', () => {
        repoConnection.modify({
            key: dynamicPage._id,
            editor: (content: ContentNode) => {
                content.language = 'en';
                content.inherit = [];

                return content;
            },
        });

        const contentNode = repoConnection.get(dynamicPage._id) as ContentNode;
        const searchDocument = buildExternalSearchDocument(contentNode, 'en');

        expect(searchDocument?.href.endsWith(dynamicPage.data.customPath)).toBeTruthy();
    });

    test('Content awaiting scheduled publishing should not generate a document', () => {
        // contentLib mock library has not implemented scheduled publish yet, so we add it manually
        repoConnection.modify({
            key: prepublishedMainArticle._id,
            editor: (content: ContentNode) => {
                content.publish = {
                    from: new Date(Date.now() + 10000).toISOString(),
                };
                return content;
            },
        });

        const contentNode = repoConnection.get(prepublishedMainArticle._id) as ContentNode;

        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument).toBeNull();
    });
});
