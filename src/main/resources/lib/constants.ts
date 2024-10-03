type ServerEnv = typeof app.config.env;
type EnvRecord = Record<ServerEnv, string>;

const env: ServerEnv = app.config.env || 'p';

const portalAdminOrigins: EnvRecord = {
    p: 'https://portal-admin.oera.no',
    dev: 'https://portal-admin-dev.oera.no',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
    test: 'http://localhost:8079',
} as const;

const frontendOrigins: EnvRecord = {
    p: 'https://www.nav.no',
    dev: 'https://www.ekstern.dev.nav.no',
    q6: 'https://www-2.ekstern.dev.nav.no',
    localhost: 'http://localhost:3000',
    test: 'http://localhost:3000',
} as const;

const revalidatorProxyOrigins: EnvRecord = {
    p: 'https://nav-enonicxp-frontend-revalidator-proxy.intern.nav.no',
    dev: 'https://nav-enonicxp-frontend-revalidator-proxy.intern.dev.nav.no',
    q6: 'https://nav-enonicxp-frontend-revalidator-proxy-2.intern.dev.nav.no',
    localhost: 'http://localhost:3002',
    test: 'http://localhost:3002',
} as const;

const norgOfficeOverviewApiUrl: EnvRecord = {
    p: 'https://norg2.intern.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    dev: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    q6: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    localhost: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    test: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
} as const;

const norgOfficeInformationApiUrl: EnvRecord = {
    p: 'https://norg2.intern.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    dev: 'https://norg2.intern.dev.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    q6: 'https://norg2.intern.dev.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    localhost: 'https://norg2.intern.dev.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    test: 'https://norg2.intern.dev.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
} as const;

const norgLegacyOfficeInformationApiUrl: EnvRecord = {
    p: 'https://norg2.intern.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    dev: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    q6: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    localhost:
        'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    test: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
} as const;

const norgLocalOfficeApiUrl: EnvRecord = {
    p: 'https://norg2.intern.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    dev: 'https://norg2.intern.dev.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    q6: 'https://norg2.intern.dev.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    localhost: 'https://norg2.intern.dev.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    test: 'https://norg2.intern.dev.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
} as const;

const xpOrigins: EnvRecord = {
    p: 'https://www.nav.no',
    dev: 'https://portal-admin-dev.oera.no',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
    test: 'http://localhost:8080',
} as const;

const searchApiUrls: EnvRecord = {
    p: 'https://navno-search-admin-api.intern.nav.no/content/personbruker',
    dev: 'https://navno-search-admin-api.intern.dev.nav.no/content/personbruker',
    q6: '',
    localhost: '', // 'https://navno-search-admin-api.intern.dev.nav.no/content/personbruker-local',
    test: '',
} as const;

export const URLS = {
    FRONTEND_ORIGIN: frontendOrigins[env],
    XP_ORIGIN: xpOrigins[env],
    REVALIDATOR_PROXY_ORIGIN: revalidatorProxyOrigins[env],
    PORTAL_ADMIN_ORIGIN: portalAdminOrigins[env],
    NORG_OFFICE_OVERVIEW_API_URL: norgOfficeOverviewApiUrl[env],
    NORG_OFFICE_INFORMATION_API_URL: norgOfficeInformationApiUrl[env],
    NORG_LEGACY_OFFICE_INFORMATION_API_URL: norgLegacyOfficeInformationApiUrl[env],
    NORG_LOCAL_OFFICE_API_URL: norgLocalOfficeApiUrl[env],
    SEARCH_API_URL: searchApiUrls[env],
} as const;

export const COMPONENT_APP_KEY = 'no-nav-navno';
export const APP_DESCRIPTOR = 'no.nav.navno';

export const CONTENT_REPO_PREFIX = 'com.enonic.cms';
export const CONTENT_ROOT_PROJECT_ID = 'default';
export const CONTENT_ROOT_REPO_ID = `${CONTENT_REPO_PREFIX}.${CONTENT_ROOT_PROJECT_ID}`;

export const CONTENT_LOCALE_DEFAULT = 'no';

export const SEARCH_REPO_ID = 'nav.no.search';
export const NAVNO_ROOT_PATH = '/www.nav.no';
export const NAVNO_NODE_ROOT_PATH = `/content${NAVNO_ROOT_PATH}`;
export const REDIRECTS_PATH = '/redirects';
export const REDIRECTS_ROOT_PATH = `${NAVNO_ROOT_PATH}${REDIRECTS_PATH}`;
export const FRONTEND_APP_NAME = 'nav-enonicxp-frontend';
export const CONTENT_STUDIO_PATH_PREFIX = '/admin/tool/com.enonic.app.contentstudio/main';

// This message is used by the frontend to differentiate between
// 404 returned from a sitecontent service and general 404 from the server
// Don't change it without also changing the implementation in the frontend!
export const SITECONTENT_404_MSG_PREFIX = 'Site path not found';

export const SYSTEM_ID_PROVIDER = 'system';
export const SYSTEM_USER = 'system-user';
export const SUPER_USER = 'su';
export const SUPER_USER_PRINCIPAL = `user:system:${SUPER_USER}`;

export const LAYERS_ID_PROVIDER = 'layers';
export const LAYERS_ANON_USER = 'layers-viewer';

export const ADMIN_PRINCIPAL = 'role:system.admin';
export const LOGGED_IN_PRINCIPAL = 'role:system.admin.login';

export const NORG2_CONSUMER_ID = 'navno-enonicxp';
