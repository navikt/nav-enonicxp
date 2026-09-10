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

export const resolveCuratedPage = ({ page }) => {
    const contentStudioPage = parseContentStudioPageUrl(page);
    if (contentStudioPage) {
        return contentStudioPage;
    }
    if (!['http:', 'https:'].includes(new URL(page).protocol)) {
        throw new Error('Page URLs must use HTTP or HTTPS');
    }
    return page;
};
