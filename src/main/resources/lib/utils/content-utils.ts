import * as contextLib from '/lib/xp/context';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { ContentDescriptor, MediaDescriptor } from '../../types/content-types/content-config';
import { fixDateFormat, getISONowWithoutMS } from './datetime-utils';
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

// Content scheduled for publishing is pushed to master when it is scheduled, but is not public
// until publish.from
export const isPublishFromInFuture = (publishFrom?: string | null) =>
    publishFrom ? publishFrom > getISONowWithoutMS() : false;

export const isContentAwaitingPrepublish = (
    content: Content<any>
): content is Content & { publish: { from: string } } =>
    isPublishFromInFuture(content.publish?.from);

type VersionPublishTimes = { timestamp: string; publishFrom?: string | null };

const toUnixTime = (dateTime: string) => new Date(fixDateFormat(dateTime)).getTime();

// A published version is public from when it was saved, or from publish.from if that is later.
// Unpublishing removes publish.from, so a newer version without it means the content was
// unpublished. A version scheduled for publishing which was unpublished before its publish time
// was never public
export const wasVersionPublic = (
    version: VersionPublishTimes,
    newerVersion?: VersionPublishTimes
) => {
    if (!version.publishFrom || isPublishFromInFuture(version.publishFrom)) {
        return false;
    }

    if (!newerVersion || newerVersion.publishFrom) {
        return true;
    }

    const publicFrom = Math.max(toUnixTime(version.timestamp), toUnixTime(version.publishFrom));
    return toUnixTime(newerVersion.timestamp) > publicFrom;
};

// If the content ref is a path, ensure it has the /content prefix
export const getContentNodeKey = (contentRef: string) =>
    contentRef.replace(/^\/www.nav.no/, NAVNO_NODE_ROOT_PATH);
