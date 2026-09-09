import { getXpSessionCookie } from './xp-session.mjs';

const PROJECT_REPOSITORIES = {
    default: 'com.enonic.cms.default',
    'navno-engelsk': 'com.enonic.cms.navno-engelsk',
    'navno-nynorsk': 'com.enonic.cms.navno-nynorsk',
};

const DEPLOYED_SOURCE_BY_HOST = {
    'www.nav.no': 'prod',
    'nav.no': 'prod',
    'portal-admin.oera.no': 'prod',
    'portal-admin-dev.oera.no': 'dev1',
    'portal-admin-q6.oera.no': 'dev2',
};

export const inferCuratedSourceFromPage = (value) => {
    const url = new URL(value);
    const deployedSource = DEPLOYED_SOURCE_BY_HOST[url.hostname];
    if (deployedSource) {
        return deployedSource;
    }
    if (parseContentStudioPageUrl(value) && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        return url.origin;
    }
    throw new Error(`Could not infer source from ${url.origin}; pass --source explicitly`);
};

export const parseContentStudioPageUrl = (value) => {
    const url = new URL(value);
    const match = url.pathname.match(
        /^\/admin\/tool\/com\.enonic\.app\.contentstudio\/main\/([^/]+)\/edit\/([a-zA-Z0-9-]+)\/?$/
    );
    if (!match) {
        return null;
    }

    const project = decodeURIComponent(match[1]);
    const repository = PROJECT_REPOSITORIES[project];
    if (!repository) {
        throw new Error(`Unsupported Content Studio project: ${project}`);
    }
    return { repository, branch: 'draft', contentId: match[2] };
};

export const resolveCuratedPage = async ({
    page,
    sourceServiceUrl,
    auth,
    fetchRequest = fetch,
    getSessionCookie = getXpSessionCookie,
}) => {
    const contentStudioPage = parseContentStudioPageUrl(page);
    if (!contentStudioPage) {
        new URL(page);
        return page;
    }

    const cookie = await getSessionCookie(sourceServiceUrl, auth);
    const url = new URL(sourceServiceUrl);
    Object.entries(contentStudioPage).forEach(([name, value]) => url.searchParams.set(name, value));
    const response = await fetchRequest(url, { headers: { Cookie: cookie } });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(`Could not resolve Content Studio page: ${response.status} ${JSON.stringify(result)}`);
    }
    if (!result.node?._path?.startsWith('/content/www.nav.no')) {
        throw new Error('Content Studio page resolved outside the curated content root');
    }
    return result.node._path;
};