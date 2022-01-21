const { frontendOrigin, xpOrigin, revalidatorProxyOrigin, env } = app.config;

const portalAdminOrigin = {
    p: 'https://portal-admin.oera.no',
    dev: 'https://portal-admin-dev.oera.no',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
}[env];

export default {
    frontendOrigin,
    xpOrigin,
    revalidatorProxyOrigin,
    portalAdminOrigin,
};
