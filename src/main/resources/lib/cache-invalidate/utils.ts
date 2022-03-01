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
