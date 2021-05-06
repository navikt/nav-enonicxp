const { frontendOrigin, xpOrigin, revalidatorProxyOrigin } = app.config;

const xpOriginFixed = xpOrigin.replace('-q1', '.dev');

module.exports = { frontendOrigin, xpOrigin: xpOriginFixed, revalidatorProxyOrigin };
