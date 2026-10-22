import { getRepoConnection } from '@navno-app/lib/repos/repo-utils';
import { toggleCacheInvalidationOnNodeEvents } from '@navno-app/lib/cache/invalidate-event-defer';
import { backfillLayerPublishInfo } from '@navno-app/lib/localization/layer-publish-info-backfill';

jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection: jest.fn() }));
jest.mock('@navno-app/lib/cache/invalidate-event-defer', () => ({
    toggleCacheInvalidationOnNodeEvents: jest.fn(),
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));
jest.mock('@navno-app/lib/localization/layers-data', () => ({
    getLayersData: () => ({
        localeToRepoIdMap: { no: 'com.enonic.cms.default', nn: 'layer-repo' },
    }),
}));
jest.mock('@navno-app/lib/utils/batched-query', () => ({
    batchedNodeQuery: () => ({
        hits: ['in-sync', 'out-of-sync', 'done', 'localized', 'not-in-root', 'failing'].map(
            (id) => ({ id })
        ),
    }),
}));

const rootPublish = { first: '2020-01-01T00:00:00Z', from: '2025-12-09T14:11:50.943Z' };
const mirroredPublish = { ...rootPublish, time: rootPublish.from };

const node = (id: string, version: string, extra: Record<string, unknown> = {}) => ({
    _id: id,
    _versionKey: version,
    inherit: ['CONTENT', 'PARENT', 'NAME', 'SORT'],
    ...extra,
});

const nodesByRepoBranch: Record<string, Array<ReturnType<typeof node>>> = {
    'layer-repo:draft': [
        node('in-sync', 'v1'),
        node('out-of-sync', 'v2'),
        node('done', 'v1', { publish: mirroredPublish }),
        node('localized', 'v1', { inherit: ['PARENT', 'SORT'] }),
        node('not-in-root', 'v1'),
        node('failing', 'v1'),
    ],
    'layer-repo:master': [
        node('in-sync', 'v1'),
        node('out-of-sync', 'v1'),
        node('done', 'v1'),
        node('localized', 'v1'),
        node('not-in-root', 'v1'),
        node('failing', 'v1'),
    ],
    'com.enonic.cms.default:master': ['in-sync', 'out-of-sync', 'done', 'localized', 'failing'].map(
        (id) => node(id, 'root', { publish: rootPublish })
    ),
};

describe('backfillLayerPublishInfo', () => {
    it('sets publish info on inherited layer content from the root project', () => {
        const patch = jest.fn(({ key }) => {
            if (key === 'failing') {
                throw new Error('Patch failed');
            }
        });
        jest.mocked(getRepoConnection).mockImplementation(
            ({ repoId, branch }) =>
                ({
                    get: (ids: string[]) =>
                        (nodesByRepoBranch[`${repoId}:${branch}`] || []).filter(({ _id }) =>
                            ids.includes(_id)
                        ),
                    patch,
                }) as never
        );

        backfillLayerPublishInfo();

        expect(patch.mock.calls.map(([{ key, branches }]) => [key, branches])).toEqual([
            ['in-sync', ['draft', 'master']],
            ['out-of-sync', ['draft']],
            ['failing', ['draft', 'master']],
        ]);

        const editedPublish = (callIndex: number) =>
            patch.mock.calls[callIndex][0].editor({}).publish;
        expect(editedPublish(0)).toEqual(mirroredPublish);
        // Out of sync content must not be marked as having no pending changes
        expect(editedPublish(1)).toEqual(rootPublish);

        expect(toggleCacheInvalidationOnNodeEvents).toHaveBeenLastCalledWith({
            shouldDefer: false,
        });
    });
});
