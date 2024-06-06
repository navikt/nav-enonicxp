import { xpMocks } from '../../../__test/__mocks/xp-mocks';
import { SearchConfigV2 } from '@xp-types/site/content-types/search-config-v2';
import { buildExternalSearchDocument } from './document-builder';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../../utils/repo-utils';
import { ContentNode } from '../../../types/content-types/content-config';

const { libContentMock, server } = xpMocks;

const searchConfigData: SearchConfigV2 = {
    defaultKeys: {
        titleKey: 'displayName',
        ingressKey: ['data.ingress', 'data.metaDescription'],
    },
    contentGroups: [
        {
            name: 'Group 1',
            contentTypes: ['no.nav.navno:main-article'],
            groupKeys: {
                textKey: 'data.text',
            },
        },
        {
            name: 'Group 2',
            contentTypes: ['no.nav.navno:dynamic-page', 'no.nav.navno:content-page-with-sidemenus'],
            groupKeys: {
                titleKey: 'data.title',
                textKey: [
                    'components.part.config.no-nav-navno.html-area.html',
                    'components.layout.config.no-nav-navno.section-with-header.title',
                ],
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

const mainArticleContent = libContentMock.create({
    contentType: 'no.nav.navno:main-article',
    data: {},
    name: 'article',
    parentPath: '/',
    displayName: 'Main article',
}) as Content<'no.nav.navno:main-article'>;

const contentListContent = libContentMock.create({
    contentType: 'no.nav.navno:content-list',
    data: {},
    name: 'content-list',
    parentPath: '/',
    displayName: 'Content list',
}) as Content<'no.nav.navno:content-list'>;

const prepublishedContent = libContentMock.create({
    contentType: 'no.nav.navno:main-article',
    data: {},
    name: 'article-prepublished',
    parentPath: '/',
    displayName: 'Main article prepublished',
}) as Content<'no.nav.navno:main-article'>;

libContentMock.publish({
    keys: [mainArticleContent._id, contentListContent._id, prepublishedContent._id],
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
    const repoConnection = getRepoConnection({
        branch: 'master',
        repoId: server.context.repository,
    });

    test('Content types with a search config should generate a document', () => {
        const contentNode = repoConnection.get(mainArticleContent._id) as ContentNode;
        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument).toBeTruthy();
    });

    test('Content types without a search config should not generate a document', () => {
        const contentNode = repoConnection.get(contentListContent._id) as ContentNode;
        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument).toBeNull();
    });

    test('Content awaiting scheduled publishing should not generate a document', () => {
        const modified = repoConnection.modify({
            key: prepublishedContent._id,
            editor: (content: ContentNode) => {
                content.publish = {
                    from: new Date(Date.now() + 1000 * 3600 * 24).toISOString(),
                };
                return content;
            },
        });

        console.log('Modified: ', modified);

        const contentNode = repoConnection.get(prepublishedContent._id) as ContentNode;

        console.log(contentNode);
        const searchDocument = buildExternalSearchDocument(contentNode, 'no');

        expect(searchDocument).toBeNull();
    });
});
