type ServerEnv = typeof app.config.env;
type EnvRecord = Record<ServerEnv, string>;

const env: ServerEnv = app.config.env || 'p';

// The Enonic Cloud PoC environment ("dev3") is the only environment currently reachable
// through the org-ekstern-proxy (and thus the only one that needs EntraID token auth to norg2).
export const IS_ENONIC_POC = env === 'dev3';

const portalAdminOrigins: EnvRecord = {
    p: 'https://portal-admin.oera.no',
    dev: 'https://portal-admin-dev.oera.no',
    dev3: 'https://trial-navpoc.enonic.cloud',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
    test: 'http://localhost:8079',
} as const;

const frontendOrigins: EnvRecord = {
    p: 'https://www.nav.no',
    dev: 'https://www.ekstern.dev.nav.no',
    dev3: 'https://www-3.ekstern.dev.nav.no',
    q6: 'https://www-2.ekstern.dev.nav.no',
    localhost: 'http://localhost:3000',
    test: 'http://localhost:3000',
} as const;

const revalidatorProxyOrigins: EnvRecord = {
    p: 'https://nav-enonicxp-frontend-revalidator-proxy.intern.nav.no',
    dev: 'https://nav-enonicxp-frontend-revalidator-proxy.intern.dev.nav.no',
    dev3: 'https://nav-enonicxp-frontend-revalidator-proxy-3.ekstern.dev.nav.no',
    q6: 'https://nav-enonicxp-frontend-revalidator-proxy-2.intern.dev.nav.no',
    localhost: 'http://localhost:3002',
    test: 'http://localhost:3002',
} as const;

const norgOfficeOverviewApiUrl: EnvRecord = {
    p: 'https://norg2.intern.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    dev: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    dev3: 'https://org-ekstern-proxy.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    q6: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    localhost: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
    test: '', // 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet?enhetStatusListe=AKTIV',
} as const;

const norgOfficeInformationApiUrl: EnvRecord = {
    p: 'https://norg2.intern.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    dev: 'https://norg2.intern.dev.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    dev3: 'https://org-ekstern-proxy.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    q6: 'https://norg2.intern.dev.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    localhost: 'https://norg2.intern.dev.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
    test: '', // 'https://norg2.intern.dev.nav.no/norg2/api/v2/enhet/kontaktinformasjoner',
} as const;

const norgLegacyOfficeInformationApiUrl: EnvRecord = {
    p: 'https://norg2.intern.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    dev: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    dev3: 'https://org-ekstern-proxy.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    q6: 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    localhost:
        'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
    test: '', // 'https://norg2.intern.dev.nav.no/norg2/api/v1/enhet/kontaktinformasjon/organisering/all',
} as const;

const norgLocalOfficeApiUrl: EnvRecord = {
    p: 'https://norg2.intern.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    dev: 'https://norg2.intern.dev.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    dev3: 'https://org-ekstern-proxy.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    q6: 'https://norg2.intern.dev.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    localhost: 'https://norg2.intern.dev.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
    test: '', //https://norg2.intern.dev.nav.no/norg2/api/v2/navlokalkontor?statusFilter=AKTIV',
} as const;

const xpOrigins: EnvRecord = {
    p: 'https://www.nav.no',
    dev: 'https://portal-admin-dev.oera.no',
    dev3: 'https://trial-navpoc.enonic.cloud',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
    test: 'http://localhost:8080',
} as const;

const searchApiUrls: EnvRecord = {
    p: 'https://navno-search-admin-api.intern.nav.no/content/personbruker',
    dev: 'https://navno-search-admin-api.intern.dev.nav.no/content/personbruker',
    dev3: 'https://navno-search-admin-api.ekstern.dev.nav.no/content/personbruker',
    q6: 'https://navno-search-admin-api.ekstern.dev.nav.no/content/personbruker',
    localhost: '',
    test: '',
} as const;

// ------------------------------------------
// EntraID (Azure AD) token scopes for various services.
// Used for requesting tokens.
// ------------------------------------------
const norgProxyTokenScope: EnvRecord = {
    p: 'api://prod-gcp.org.norg2/.default',
    dev: '',
    dev3: 'api://prod-gcp.org.norg2/.default',
    q6: '',
    localhost: '',
    test: '',
} as const;

const revalidatorProxyTokenScope: EnvRecord = {
    p: '',
    dev: '',
    dev3: 'api://dev-gcp.navno.nav-enonicxp-frontend-revalidator-proxy-dev3/.default',
    q6: '',
    localhost: '',
    test: '',
} as const;

const frontendTokenScope: EnvRecord = {
    p: '',
    dev: '',
    dev3: 'api://dev-gcp.navno.nav-enonicxp-frontend/.default',
    q6: '',
    localhost: '',
    test: '',
} as const;

const searchAdminApiTokenScope: EnvRecord = {
    p: '',
    dev: '',
    dev3: 'api://dev-gcp.navno.navno-search-admin-api/.default',
    q6: '',
    localhost: '',
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

export const MISC_REPO_ID = 'nav.no.misc';
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
export const SYSTEM_USER_PRINCIPAL = `user:${SYSTEM_ID_PROVIDER}:${SYSTEM_USER}`;
export const SUPER_USER = 'su';
export const SUPER_USER_PRINCIPAL = `user:${SYSTEM_ID_PROVIDER}:${SUPER_USER}`;

export const LAYERS_ID_PROVIDER = 'layers';
export const LAYERS_ANON_USER = 'layers-viewer';

export const ADMIN_PRINCIPAL = 'role:system.admin';
export const LOGGED_IN_PRINCIPAL = 'role:system.admin.login';

export const NORG2_CONSUMER_ID = 'navno-enonicxp';

// EntraID (Azure AD), Verified via https://login.microsoftonline.com/navno.onmicrosoft.com/.well-known/openid-configuration
export const AZURE_AD_TENANT_ID = '62366534-1ec3-4962-8869-9b5535279d0b';
export const AZURE_AD_TOKEN_URL = `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

// XP calls misc services in Nav. Add scopec
export const NORG_PROXY_TOKEN_SCOPE = norgProxyTokenScope[env];

// Scope requested when authenticating to the revalidator-proxy (see revalidatorProxyTokenScope
// above). Empty for non-cloud environments, which do not use EntraID auth for this call.
export const REVALIDATOR_PROXY_TOKEN_SCOPE = revalidatorProxyTokenScope[env];

// Scope requested when authenticating to the frontend (see frontendTokenScope above).
// Empty for non-cloud environments, which do not use EntraID auth for this call.
export const FRONTEND_TOKEN_SCOPE = frontendTokenScope[env];

// Scope requested when authenticating to navno-search-admin-api (see searchAdminApiTokenScope above).
// Empty for non-cloud environments, which do not use EntraID auth for this call.
export const SEARCH_API_TOKEN_SCOPE = searchAdminApiTokenScope[env];

// Routing headers required by org-ekstern-proxy to forward the request to the target app (norg2).
export const NORG_PROXY_TARGET_CLIENT_ID = '5b951a3e-08f8-4c1e-b5de-7b6d6dc668c3'; //'20c8fc78-f9a4-4dae-b4dd-07b8db088545';
export const NORG_PROXY_TARGET_APP = 'norg2';
