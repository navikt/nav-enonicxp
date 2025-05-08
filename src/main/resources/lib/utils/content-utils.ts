import * as contextLib from '/lib/xp/context';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { ContentDescriptor, MediaDescriptor } from '../../types/content-types/content-config';
import { getISONowWithoutMS } from './datetime-utils';
import { logger } from './logging';
import { COMPONENT_APP_KEY } from '../constants';

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

// If the content ref is a path, ensure it has the /content prefix
export const getContentNodeKey = (contentRef: string) =>
    contentRef.replace(/^\/www.nav.no/, '/content/www.nav.no');
