import { ContentNode } from '@navno-app/types/content-types/content-config';
import { handleScheduledPublish } from '@navno-app/lib/scheduling/scheduled-publish';
import { xpMocks } from '../../../.mocks/xp-mocks';

const { libContentMock, libNodeMock, server } = xpMocks;

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
    const repo = libNodeMock.connect({ repoId: server.context.repository, branch: 'main' });

    test('Should not schedule anything for published content', () => {
        const contentData = repo.get(content._id) as ContentNode;

        const isScheduled = handleScheduledPublish(
            {
                branch: 'main',
                path: contentData._path,
                id: contentData._id,
                repo: server.context.repository,
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
                branch: 'main',
                path: contentData._path,
                id: contentData._id,
                repo: server.context.repository,
            },
            'node.pushed'
        );

        expect(isScheduled).toBe(true);
    });
});
