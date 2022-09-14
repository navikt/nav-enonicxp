import { Content } from '/lib/xp/content';
import { appDescriptor, navnoRootPath } from '../constants';
import {
    BuiltinContentDescriptor,
    CustomContentDescriptor,
} from '../../types/content-types/content-config';
import { isMedia } from '../utils/nav-utils';

export type NodeEventData = {
    id: string;
    path: string;
    branch: string;
    repo: string;
};

// Matches [/content]/www.nav.no/*
const pathnameFilter = new RegExp(`^(/content)?(${navnoRootPath})/`);

export const getFrontendPathname = (path: string) => path.replace(pathnameFilter, '/');

export const generateCacheEventId = (nodeData: NodeEventData, timestamp: number) =>
    `${nodeData.id}-${timestamp}`;

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

const ignoredContentTypeMap = [...ignoredBaseContentTypes, ...ignoredCustomContentTypes].reduce(
    (acc, type) => ({ ...acc, [type]: true }),
    {} as { [type: string]: boolean }
);

// Returns false for content types which are not rendered by the user-facing frontend
export const isRenderedType = (content: Content | null) =>
    content && !isMedia(content) && !ignoredContentTypeMap[content.type];
