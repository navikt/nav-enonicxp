import { getRepoConnection } from '@navno-app/lib/repos/repo-utils';
import {
    buildPublishedLayerPublishInfo,
    clearLayerDraftPublishInfo,
    mirrorRootPublishInfoToLayerDraft,
    setLayerDraftPublishInfoFromRoot,
} from '@navno-app/lib/localization/layer-publish-info';

jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection: jest.fn() }));

const rootPublish = {
    first: '2020-01-01T00:00:00Z',
    from: '2025-12-09T14:11:50.943Z',
    time: '2025-12-09T14:11:50.943Z',
};

const inherited = (publish?: Record<string, string>) => ({
    _id: 'content-id',
    inherit: ['CONTENT', 'PARENT', 'NAME', 'SORT'],
    ...(publish && { publish }),
});

const runEditor = (patch: jest.Mock, node: Record<string, unknown>) =>
    patch.mock.calls[0][0].editor({ ...node });

const mockRepos = (nodes: Record<string, unknown>) => {
    const patch = jest.fn();
    jest.mocked(getRepoConnection).mockImplementation(
        ({ repoId, branch }) =>
            ({
                get: () => nodes[`${repoId}:${branch}`] ?? null,
                patch,
            }) as never
    );
    return patch;
};

describe('buildPublishedLayerPublishInfo', () => {
    it('mirrors the root publish info', () => {
        expect(buildPublishedLayerPublishInfo(undefined, rootPublish)).toEqual(rootPublish);
    });

    it('keeps the time of first publish in the layer', () => {
        expect(
            buildPublishedLayerPublishInfo({ first: '2024-01-01T00:00:00Z' }, rootPublish).first
        ).toBe('2024-01-01T00:00:00Z');
    });

    it('falls back to the publish start for root content without first/time', () => {
        expect(buildPublishedLayerPublishInfo(undefined, { from: rootPublish.from })).toEqual({
            first: rootPublish.from,
            from: rootPublish.from,
            to: undefined,
            time: rootPublish.from,
        });
    });
});

describe('mirrorRootPublishInfoToLayerDraft', () => {
    it('patches only the layer draft with the root publish info', () => {
        const patch = jest.fn();
        const layerNode = inherited();

        expect(
            mirrorRootPublishInfoToLayerDraft({ patch } as never, layerNode as never, rootPublish)
        ).toBe(true);
        expect(patch).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'content-id', branches: ['draft'] })
        );
        expect(runEditor(patch, layerNode).publish).toEqual(rootPublish);
    });

    it('does not patch content which already has the expected publish info', () => {
        const patch = jest.fn();

        expect(
            mirrorRootPublishInfoToLayerDraft(
                { patch } as never,
                inherited(rootPublish) as never,
                rootPublish
            )
        ).toBe(false);
        expect(patch).not.toHaveBeenCalled();
    });

    it('does not patch when the root content has no publish info', () => {
        const patch = jest.fn();

        expect(
            mirrorRootPublishInfoToLayerDraft({ patch } as never, inherited() as never, undefined)
        ).toBe(false);
        expect(patch).not.toHaveBeenCalled();
    });
});

describe('setLayerDraftPublishInfoFromRoot', () => {
    it('reads the publish info from the root master', () => {
        const patch = mockRepos({
            'com.enonic.cms.default:master': inherited(rootPublish),
            'layer-repo:draft': inherited(),
        });

        setLayerDraftPublishInfoFromRoot('content-id', 'layer-repo');

        expect(runEditor(patch, inherited()).publish).toEqual(rootPublish);
    });

    it('does not patch localized layer content', () => {
        const patch = mockRepos({
            'com.enonic.cms.default:master': inherited(rootPublish),
            'layer-repo:draft': { _id: 'content-id', inherit: ['PARENT', 'SORT'] },
        });

        setLayerDraftPublishInfoFromRoot('content-id', 'layer-repo');

        expect(patch).not.toHaveBeenCalled();
    });
});

describe('clearLayerDraftPublishInfo', () => {
    it('keeps only the time of first publish', () => {
        const layerNode = inherited(rootPublish);
        const patch = mockRepos({ 'layer-repo:draft': layerNode });

        clearLayerDraftPublishInfo('content-id', 'layer-repo');

        expect(patch).toHaveBeenCalledWith(expect.objectContaining({ branches: ['draft'] }));
        expect(runEditor(patch, layerNode).publish).toEqual({ first: rootPublish.first });
    });

    it('removes the publish info for content which was never published', () => {
        const layerNode = inherited({ from: rootPublish.from });
        const patch = mockRepos({ 'layer-repo:draft': layerNode });

        clearLayerDraftPublishInfo('content-id', 'layer-repo');

        expect(runEditor(patch, layerNode)).not.toHaveProperty('publish');
    });

    it('does not patch content which is already unpublished', () => {
        const patch = mockRepos({
            'layer-repo:draft': inherited({ first: rootPublish.first }),
        });

        clearLayerDraftPublishInfo('content-id', 'layer-repo');

        expect(patch).not.toHaveBeenCalled();
    });
});
