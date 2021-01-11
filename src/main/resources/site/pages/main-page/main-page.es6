// const frontendProxy = require('/lib/headless/controllers/frontend-proxy-controller');

exports.get = () => {
    return {
        status: 200,
        body: '<div>oh noes!</div>',
        contentType: 'text/html',
    };
};

// frontendProxy;
