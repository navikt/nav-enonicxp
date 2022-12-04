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

export const urls = {
    frontendOrigin,
    xpOrigin,
    revalidatorProxyOrigin,
    portalAdminOrigin,
};

export const componentAppKey = 'no-nav-navno';
export const appDescriptor = 'no.nav.navno';
export const contentRepo = 'com.enonic.cms.default';
export const searchRepo = 'nav.no.search';
export const navnoRootPath = '/www.nav.no';
export const redirectsRootPath = `${navnoRootPath}/redirects`;
export const frontendAppName = 'nav-enonicxp-frontend';
export const contentStudioEditPathPrefix =
    '/admin/tool/com.enonic.app.contentstudio/main/default/edit';
