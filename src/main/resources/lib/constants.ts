export const componentAppKey = 'no-nav-navno';
const { frontendOrigin, xpOrigin, revalidatorProxyOrigin, env } = app.config;

const portalAdminOrigin = {
    p: 'https://portal-admin.oera.no',
    dev: 'https://portal-admin-dev.oera.no',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
}[env];

export const urls = {
    frontendOrigin,
    xpOrigin,
    revalidatorProxyOrigin,
    portalAdminOrigin,
};

// TODO: find other constants currently repeated throughout the code base and add them here
