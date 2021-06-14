const getServiceName = (req) => req.contextPath.split('/').slice(-1)[0];

const getSubPath = (req) =>
    req.path
        .split(getServiceName(req))
        .slice(-1)[0]
        .replace(/(^\/)|(\/$)/, ''); // Trim leading/trailing slash

module.exports = { getSubPath };
