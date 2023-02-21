import { Content } from '/lib/xp/content';
import { appDescriptor, navnoRootPath } from '../constants';
import {
    BuiltinContentDescriptor,
    CustomContentDescriptor,
} from '../../types/content-types/content-config';
import { isMedia, stringArrayToSet } from '../utils/nav-utils';

export type NodeEventData = {
    id: string;
    path: string;
    branch: string;
    repo: string;
};

// Matches the _path on nodes from both contentLib and nodeLib.repoConnection get/query functions
const pathnameFilter = new RegExp(`^(/content)?(${navnoRootPath})/`);

export const getFrontendPathname = (path: string) => path.replace(pathnameFilter, '/');

export const generateCacheEventId = (nodeData: NodeEventData, timestamp: number) =>
    `${nodeData.id}-${nodeData.repo}-${timestamp}`;

const ignoredBaseContentTypes: BuiltinContentDescriptor[] = [
    'base:folder',
    'portal:template-folder',
    'portal:page-template',
    'portal:site',
];

const ignoredCustomContentTypes: CustomContentDescriptor[] = [
    `${appDescriptor}:animated-icons`,
    `${appDescriptor}:calculator`,
    `${appDescriptor}:contact-information`,
    `${appDescriptor}:content-list`,
    `${appDescriptor}:global-value-set`,
    `${appDescriptor}:megamenu-item`,
    `${appDescriptor}:publishing-calendar-entry`,
];

const ignoredContentTypeSet = stringArrayToSet([
    ...ignoredBaseContentTypes,
    ...ignoredCustomContentTypes,
]);

// Returns false for content types which are not rendered by the public-facing frontend
export const isRenderedType = (content: Content | null) =>
    content && !isMedia(content) && !ignoredContentTypeSet[content.type];
