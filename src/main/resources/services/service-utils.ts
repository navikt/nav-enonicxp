const getServiceName = (req: XP.Request) => req.contextPath.split('/').slice(-1)[0];

export const getSubPath = (req: XP.Request) =>
    req.path
        .split(getServiceName(req))
        .slice(-1)[0]
        .replace(/(^\/)|(\/$)/, ''); // Trim leading/trailing slash
