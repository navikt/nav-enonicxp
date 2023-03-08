import { Content } from '/lib/xp/content';
import { APP_DESCRIPTOR } from '../constants';
import {
    BuiltinContentDescriptor,
    CustomContentDescriptor,
} from '../../types/content-types/content-config';
import { isMedia } from '../utils/mixed-bag-of-utils';
import { stringArrayToSet } from '../utils/array-utils';

export type NodeEventData = {
    id: string;
    path: string;
    branch: string;
    repo: string;
};

export const generateCacheEventId = (nodeData: NodeEventData, timestamp: number) =>
    `${nodeData.id}-${nodeData.repo}-${timestamp}`;

const ignoredBaseContentTypes: BuiltinContentDescriptor[] = [
    'base:folder',
    'portal:template-folder',
    'portal:page-template',
    'portal:site',
];

const ignoredCustomContentTypes: CustomContentDescriptor[] = [
    `${APP_DESCRIPTOR}:animated-icons`,
    `${APP_DESCRIPTOR}:calculator`,
    `${APP_DESCRIPTOR}:contact-information`,
    `${APP_DESCRIPTOR}:content-list`,
    `${APP_DESCRIPTOR}:global-value-set`,
    `${APP_DESCRIPTOR}:megamenu-item`,
    `${APP_DESCRIPTOR}:publishing-calendar-entry`,
];

const ignoredContentTypeSet = stringArrayToSet([
    ...ignoredBaseContentTypes,
    ...ignoredCustomContentTypes,
]);

// Returns false for content types which are not rendered by the public-facing frontend
export const isPublicRenderedType = (content: Content | null) =>
    content && !isMedia(content) && !ignoredContentTypeSet[content.type];
