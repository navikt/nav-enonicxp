import thymeleafLib from '/lib/thymeleaf';
import { frontendProxy } from '../../lib/controllers/frontend-proxy';
import { navnoRootPath } from '../../lib/constants';

const basicErrorView = resolve('error.html');

export const handleError = (req: XP.ErrorRequest) => {
    // For non-404 errors, return a basic error message
    if (req.status !== 404) {
        return {
            status: req.status,
            contentType: 'text/html; charset=UTF-8',
            body: thymeleafLib.render(basicErrorView, {
                status: req.status,
                message: req.message,
            }),
        };
    }

    // Get 404 from the frontend for request to master (from the public)
    if (req.request.branch === 'master') {
        return frontendProxy(req.request, '/404');
    }

    // If the requested path is a customPath, or some other custom mapping that the frontend + sitecontent
    // pipeline can resolve, this should ensure it gets resolved (otherwise, this will also ultimately
    // return 404)
    const possiblePaths = req.request.rawPath.split(navnoRootPath);

    return frontendProxy(req.request, possiblePaths[1] || possiblePaths[0]);
};
