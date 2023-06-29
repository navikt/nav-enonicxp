type ServerEnv = typeof app.config.env;
type EnvRecord = Record<ServerEnv, string>;

const env = app.config.env || 'p';

const portalAdminOrigins: EnvRecord = {
    p: 'https://portal-admin.oera.no',
    dev: 'https://portal-admin-dev.oera.no',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
};

const frontendOrigins: EnvRecord = {
    p: 'https://www.nav.no',
    dev: 'https://www.ekstern.dev.nav.no',
    q6: 'https://www-2.ekstern.dev.nav.no',
    localhost: 'http://localhost:3000',
};

const revalidatorProxyOrigins: EnvRecord = {
    p: 'https://www.nav.no/revalidator-proxy',
    dev: 'https://nav-enonicxp-frontend-revalidator-proxy.intern.dev.nav.no',
    q6: 'https://nav-enonicxp-frontend-revalidator-proxy-2.intern.dev.nav.no',
    localhost: 'http://localhost:3002',
};

const norgOfficeApiUrls: EnvRecord = {
    p: 'https://norg2.prod-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    dev: 'https://norg2.dev-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    q6: 'https://norg2.dev-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    localhost: 'https://norg2.dev-fss-pub.nais.io/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
};

const xpOrigins: EnvRecord = {
    p: 'https://www.nav.no',
    dev: 'https://portal-admin-dev.oera.no',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
};

export const URLS = Object.freeze({
    FRONTEND_ORIGIN: frontendOrigins[env],
    XP_ORIGIN: xpOrigins[env],
    REVALIDATOR_PROXY_ORIGIN: revalidatorProxyOrigins[env],
    PORTAL_ADMIN_ORIGIN: portalAdminOrigins[env],
    NORG_OFFICE_API_URL: norgOfficeApiUrls[env],
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

// This message is used by the frontend to differentiate between
// 404 returned from a sitecontent service and general 404 from the server
// Don't change it without also changing the implementation in the frontend!
export const SITECONTENT_404_MSG_PREFIX = 'Site path not found';
