import * as contextLib from '/lib/xp/context';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { ContentDescriptor, MediaDescriptor } from '../../types/content-types/content-config';
import { logger } from './logging';
import { COMPONENT_APP_KEY } from '../constants';

export const isMedia = (content: Content): content is Content<MediaDescriptor> =>
    content.type.startsWith('media:');

export const isArchivedContentNode = (content: RepoNode<Content>) =>
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

export const contentIsPreviewOnly = (content: Content) => {
    return !!content.x?.[COMPONENT_APP_KEY]?.previewOnly?.previewOnly;
};
