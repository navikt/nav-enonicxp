const { frontendOrigin, xpOrigin, revalidatorProxyOrigin, env } = app.config;

const portalAdminOrigin = {
    p: 'https://portal-admin.oera.no',
    dev: 'https://portal-admin-dev.oera.no',
    q6: 'https://portal-admin-q6.oera.no',
    localhost: 'http://localhost:8080',
}[env];

const searchIndexerBaseUrl = {
    dev: 'https://person.dev.intern.nav.no/search-index',
    localhost: 'http://localhost:3011/search-index',
}[env];

module.exports = {
    frontendOrigin,
    xpOrigin,
    revalidatorProxyOrigin,
    portalAdminOrigin,
    searchIndexerBaseUrl,
};
