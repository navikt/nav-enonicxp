import { ContentNode } from '@navno-app/types/content-types/content-config';
import { handleScheduledPublish } from '@navno-app/lib/scheduling/scheduled-publish';
import { xpMocks } from '../../../.mocks/xp-mocks';

const { libContentMock, libNodeMock, server } = xpMocks;

// XP8 types the context repository as optional, but the mock server is always created with one
const repoId = server.context.repository!;

// XP8 types RepoConnection without the deprecated modify(), which mock-xp still implements
type MockRepoConnection = ReturnType<typeof libNodeMock.connect> & {
    modify: <NodeData = ContentNode>(params: {
        key: string;
        editor: (node: NodeData) => NodeData;
    }) => NodeData;
};

const content = libContentMock.create({
    contentType: 'no.nav.navno:dynamic-page',
    parentPath: '/',
    name: 'normal-publish',
    data: {},
});

libContentMock.publish({
    keys: [content._id],
});

describe('Scheduled publishing event handler', () => {
    const repo = libNodeMock.connect({ repoId, branch: 'master' }) as MockRepoConnection;

    test('Should not schedule anything for published content', () => {
        const contentData = repo.get(content._id) as ContentNode;

        const isScheduled = handleScheduledPublish(
            {
                branch: 'master',
                path: contentData._path,
                id: contentData._id,
                repo: repoId,
            },
            'node.pushed'
        );

        expect(isScheduled).toBe(false);
    });

    test('Should schedule pre-publish for pre-published content', () => {
        repo.modify({
            key: content._id,
            editor: (content) => {
                content.publish = { from: new Date(Date.now() + 10000).toISOString() };
                return content;
            },
        });

        const contentData = repo.get(content._id) as ContentNode;

        const isScheduled = handleScheduledPublish(
            {
                branch: 'master',
                path: contentData._path,
                id: contentData._id,
                repo: repoId,
            },
            'node.pushed'
        );

        expect(isScheduled).toBe(true);
    });
});
