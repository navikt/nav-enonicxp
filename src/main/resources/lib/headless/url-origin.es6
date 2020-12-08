const { env } = app.config;

const frontendOriginMap = {
    localhost: 'http://localhost:3000',
    q6: 'https://www-q6.nav.no',
    q1: 'https://www-q1.nav.no',
    q0: 'https://www-q0.nav.no',
    p: 'https://www.nav.no',
};

const xpOriginMap = {
    ...frontendOriginMap,
    localhost: 'http://localhost:8080',
};

const revalidatorProxyOriginMap = {
    localhost: 'http://localhost:3002',
    q6: 'https://nav-enonicxp-frontend-revalidator-proxy-q6.nais.oera-q.local',
    q1: 'https://nav-enonicxp-frontend-revalidator-proxy-q1.nais.oera-q.local',
    q0: 'https://nav-enonicxp-frontend-revalidator-proxy-q0.nais.oera-q.local',
    p: 'https://nav-enonicxp-frontend-revalidator-proxy.nais.oera.no',
};

const frontendOrigin = frontendOriginMap[env] || frontendOriginMap.p;
const xpOrigin = xpOriginMap[env] || xpOriginMap.p;
const revalidatorProxyOrigin = revalidatorProxyOriginMap[env] || revalidatorProxyOriginMap.p;

module.exports = { frontendOrigin, xpOrigin, revalidatorProxyOrigin };
