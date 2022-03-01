import { Content } from '/lib/xp/content';
import { appDescriptor } from '../constants';

export type NodeEventData = {
    id: string;
    path: string;
    branch: string;
    repo: string;
};

const sitePath = '/www.nav.no/';
const redirectPath = '/redirects/';

// Matches [/content]/www.nav.no/* and [/content]/redirects/*
const pathnameFilter = new RegExp(`^(/content)?(${redirectPath}|${sitePath})`);

export const getFrontendPathname = (path: string) => path.replace(pathnameFilter, '/');

export const generateCacheEventId = (nodeData: NodeEventData, timestamp: number) =>
    `${nodeData.id}-${timestamp}`;

const ignoredBaseContentTypes = [
    'base:folder',
    'portal:template-folder',
    'portal:page-template',
    'portal:site',
];

const ignoredCustomContentTypes = [
    'animated-icons',
    'breaking-news',
    'calculator',
    'cms2xp_page',
    'cms2xp_section',
    'contact-information',
    'content-list',
    'generic-page',
    'global-value-set',
    'link-list',
    'megamenu-item',
    'notification',
    'publishing-calendar-entry',
    'searchresult',
].map((typeSuffix) => `${appDescriptor}:${typeSuffix}`);

const ignoredContentTypeMap = [...ignoredBaseContentTypes, ...ignoredCustomContentTypes].reduce(
    (acc, type) => ({ [type]: true }),
    {} as { [key: string]: boolean }
);

const isMedia = (type: string) => type.startsWith('media:');

// Returns false for content types which are not rendered by the user-facing frontend
export const isRenderedType = (content: Content) =>
    !isMedia(content.type) && !ignoredContentTypeMap[content.type];
