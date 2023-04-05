const { xpOrigin, env } = app.config;

const portalAdminOrigin = {
    p: 'https://portal-admin.oera.no',
    dev: 'https://portal-admin-dev.oera.no',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
}[env];

const frontendOrigin = {
    p: 'https://www.nav.no',
    dev: 'https://www.dev.nav.no',
    q6: 'https://www-2.dev.nav.no',
    localhost: 'http://localhost:3000',
}[env];

const revalidatorProxyOrigin = {
    p: 'https://www.nav.no/revalidator-proxy',
    dev: 'https://nav-enonicxp-frontend-revalidator-proxy.dev.nav.no',
    q6: 'https://nav-enonicxp-frontend-revalidator-proxy-2.dev.nav.no',
    localhost: 'http://localhost:3002',
}[env];

const norgOfficeOrigin = {
    p: 'https://norg2.prod-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    dev: 'https://norg2.dev-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    q6: 'https://norg2.dev-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    localhost: 'https://norg2.dev-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
}[env];

export const URLS = Object.freeze({
    FRONTEND_ORIGIN: frontendOrigin,
    XP_ORIGIN: xpOrigin,
    REVALIDATOR_PROXY_ORIGIN: revalidatorProxyOrigin,
    PORTAL_ADMIN_ORIGIN: portalAdminOrigin,
    NORG_OFFICE_ORIGIN: norgOfficeOrigin,
});

export const COMPONENT_APP_KEY = 'no-nav-navno';
export const APP_DESCRIPTOR = 'no.nav.navno';

export const CONTENT_REPO_PREFIX = 'com.enonic.cms';
export const CONTENT_ROOT_PROJECT_ID = 'default';
export const CONTENT_ROOT_REPO_ID = `${CONTENT_REPO_PREFIX}.${CONTENT_ROOT_PROJECT_ID}`;

export const CONTENT_LOCALE_DEFAULT = 'no';

export const SEARCH_REPO_ID = 'nav.no.search';
export const NAVNO_ROOT_PATH = '/www.nav.no';
export const REDIRECTS_ROOT_PATH = `${NAVNO_ROOT_PATH}/redirects`;
export const FRONTEND_APP_NAME = 'nav-enonicxp-frontend';
export const CONTENT_STUDIO_EDIT_PATH_PREFIX =
    '/admin/tool/com.enonic.app.contentstudio/main/default/edit';
