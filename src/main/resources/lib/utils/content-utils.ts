import * as contextLib from '/lib/xp/context';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { ContentDescriptor, MediaDescriptor } from '../../types/content-types/content-config';
import { getISONowWithoutMS } from './datetime-utils';
import { logger } from './logging';
import { COMPONENT_APP_KEY, NAVNO_NODE_ROOT_PATH } from '../constants';

export const isMedia = (content: Content): content is Content<MediaDescriptor> =>
    content.type.startsWith('media:');

export const isArchivedContentNode = (content: RepoNode<Content> | Content) =>
    content._path.startsWith('/archive');

export const applyModifiedData = <ContentType extends ContentDescriptor>(
    content: RepoNode<Content<ContentType>>
) => {
    const context = contextLib.get();
    const userKey = context.authInfo?.user?.key;

    if (userKey) {
        (content.modifier as string) = userKey;
    } else {
        logger.error(
            `Could not determine current user when setting modifier for ${
                content._id
            } - current context: ${JSON.stringify(context)}`
        );
    }

    (content.modifiedTime as string) = new Date().toISOString();

    return content;
};

export const isContentPreviewOnly = (content: Content) => {
    return !!content.x?.[COMPONENT_APP_KEY]?.previewOnly?.previewOnly;
};

const isContentUsingExternalProductUrl = (content: Content) => {
    const hasExternalProductUrl = content.data.externalProductUrl;
    if (!hasExternalProductUrl) return false;
    if (content.data.customPath) {
        return `https://www.nav.no${content.data.customPath}` !== content.data.externalProductUrl;
    }
    return !!content.data.externalProductUrl;
};

const isContentContainingUtkast = (content: Content) =>
    !!content.data?.customPath?.includes('utkast') || !!content._path.includes('utkast');

const isContentContainPublishFromDate = (content: Content) => !content.publish?.from;

export const isExcludedFromExternalArchive = (content: Content) => {
    return (
        isContentPreviewOnly(content) ||
        isContentUsingExternalProductUrl(content) ||
        isContentContainingUtkast(content) ||
        isContentContainPublishFromDate(content)
    );
};

export const getContentLocaleRedirectTarget = (content: Content) => {
    return content.x?.[COMPONENT_APP_KEY]?.redirectToLayer?.locale as string | undefined;
};

export const isContentNoIndex = (content: Content<any>) => {
    return !!content.data?.noindex;
};

export const isContentAwaitingPrepublish = (
    content: Content<any>
): content is Content & { publish: { from: string } } => {
    const publishFrom = content.publish?.from;
    const isoNow = getISONowWithoutMS();
    return publishFrom ? publishFrom > isoNow : false;
};

// Whether a version was public on nav.no at some point. replacedTime is when the next version was
// saved. The next version replaced this version in master when it was published or unpublished,
// which is at the same time or later. The times are ISO strings in UTC, which can be compared as
// text
export const wasVersionPublic = (publishFrom?: string | null, replacedTime?: string | null) => {
    // Not published. Unpublishing removes publish.from
    if (!publishFrom) {
        return false;
    }

    // Scheduled for publishing, and the publish time has not passed yet. Content scheduled for
    // publishing is in master before it is public
    if (publishFrom > getISONowWithoutMS()) {
        return false;
    }

    // Scheduled for publishing, but unpublished or scheduled for another time before the publish
    // time. Also leaves out a version which was public for a while, if the next version was saved
    // before the publish time and published after it. Commit times would show this, but can be
    // overwritten later, and then a version which was never public would be shown
    if (replacedTime && replacedTime < publishFrom) {
        return false;
    }

    return true;
};

// If the content ref is a path, ensure it has the /content prefix
export const getContentNodeKey = (contentRef: string) =>
    contentRef.replace(/^\/www.nav.no/, NAVNO_NODE_ROOT_PATH);
