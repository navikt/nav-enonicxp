const frontendOriginMap = {
    localhost: 'http://localhost:3000',
    q6: 'https://www-q6.nav.no',
    q1: 'https://www-q1.nav.no',
    q0: 'https://www-q0.nav.no',
    p: 'https://www.nav.no',
};

const xpOriginMap = {
    localhost: 'http://localhost:8080',
    q6: 'https://www-q6.nav.no',
    q1: 'https://www-q1.nav.no',
    q0: 'https://www-q0.nav.no',
    p: 'https://www.nav.no',
};

const urlOrigin = frontendOriginMap[app.config.env] || frontendOriginMap.p;
const xpOrigin = xpOriginMap[app.config.env] || frontendOriginMap.p;

module.exports = { frontendOrigin: urlOrigin, xpOrigin };
