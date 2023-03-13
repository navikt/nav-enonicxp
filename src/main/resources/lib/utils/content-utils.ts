import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { MediaDescriptor } from '../../types/content-types/content-config';

export const isMedia = (content: Content): content is Content<MediaDescriptor> =>
    content.type.startsWith('media:');

export const isArchivedContentNode = (content: RepoNode<Content>) =>
    content._path.startsWith('/archive');
