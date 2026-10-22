import * as valueLib from '/lib/xp/value';
import { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { getRepoConnection } from '../repos/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { isContentLocalized } from './locale-utils';

// XP8 Content Studio derives the publish status of content from the publish info on draft: "from"
// means online, "first" means previously published, and "time" means no pending changes. Inherited
// layer content is published with raw node pushes, which do not set this info, so we mirror the
// publish info from the root project. Without it, inherited layer content is shown as offline.

export type PublishInfo = NonNullable<Content['publish']>;

const PUBLISH_INFO_KEYS = ['first', 'from', 'to', 'time'] as const;

export const buildPublishedLayerPublishInfo = (
    layerPublish: PublishInfo | undefined,
    rootPublish: PublishInfo
): PublishInfo => ({
    first: layerPublish?.first || rootPublish.first || rootPublish.from,
    from: rootPublish.from,
    to: rootPublish.to,
    time: rootPublish.time || rootPublish.from,
});

// Mirrors what XP does when unpublishing content: only the time of first publish is kept
export const buildUnpublishedLayerPublishInfo = (
    layerPublish: PublishInfo | undefined
): PublishInfo => ({ first: layerPublish?.first });

export const isEqualPublishInfo = (a: PublishInfo | undefined, b: PublishInfo | undefined) =>
    PUBLISH_INFO_KEYS.every((key) => (a?.[key] || undefined) === (b?.[key] || undefined));

export const patchPublishInfo = (
    layerDraft: RepoConnection,
    contentId: string,
    publishInfo: PublishInfo,
    branches: string[]
) => {
    layerDraft.patch({
        key: contentId,
        branches,
        editor: (node) => {
            const nodePublishInfo: Record<string, unknown> = {};
            PUBLISH_INFO_KEYS.forEach((key) => {
                const value = publishInfo[key];
                if (value) {
                    // Must be stored as instants, or they won't work with date queries
                    nodePublishInfo[key] = valueLib.instant(value);
                }
            });

            if (Object.keys(nodePublishInfo).length > 0) {
                node.publish = nodePublishInfo;
            } else {
                delete node.publish;
            }

            return node;
        },
    });
};

const getLayerDraftContent = (layerDraft: RepoConnection, contentId: string) => {
    const content = layerDraft.get<Content>(contentId);
    return content && !isContentLocalized(content) ? content : null;
};

// Returns true if the layer draft was patched, which means it must be pushed to master
export const mirrorRootPublishInfoToLayerDraft = (
    layerDraft: RepoConnection,
    layerContentDraft: Content,
    rootPublish: PublishInfo | undefined
) => {
    if (!rootPublish?.from) {
        return false;
    }

    const publishInfo = buildPublishedLayerPublishInfo(layerContentDraft.publish, rootPublish);

    if (isEqualPublishInfo(layerContentDraft.publish, publishInfo)) {
        return false;
    }

    patchPublishInfo(layerDraft, layerContentDraft._id, publishInfo, ['draft']);

    return true;
};

// Call before pushing inherited layer content to master
export const setLayerDraftPublishInfoFromRoot = (contentId: string, repoId: string) => {
    const rootContentMaster = getRepoConnection({
        repoId: CONTENT_ROOT_REPO_ID,
        branch: 'master',
        asAdmin: true,
    }).get<Content>(contentId);

    if (!rootContentMaster) {
        return;
    }

    const layerDraft = getRepoConnection({ repoId, branch: 'draft', asAdmin: true });

    const layerContentDraft = getLayerDraftContent(layerDraft, contentId);
    if (!layerContentDraft) {
        return;
    }

    mirrorRootPublishInfoToLayerDraft(layerDraft, layerContentDraft, rootContentMaster.publish);
};

// Call after deleting inherited layer content from master
export const clearLayerDraftPublishInfo = (contentId: string, repoId: string) => {
    const layerDraft = getRepoConnection({ repoId, branch: 'draft', asAdmin: true });

    const layerContentDraft = getLayerDraftContent(layerDraft, contentId);
    if (!layerContentDraft) {
        return;
    }

    const publishInfo = buildUnpublishedLayerPublishInfo(layerContentDraft.publish);

    if (isEqualPublishInfo(layerContentDraft.publish, publishInfo)) {
        return;
    }

    patchPublishInfo(layerDraft, contentId, publishInfo, ['draft']);
};
