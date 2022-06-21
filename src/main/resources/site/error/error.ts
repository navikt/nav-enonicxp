import thymeleafLib from '/lib/thymeleaf';
import { adminFrontendProxy } from '../../lib/controllers/admin-frontend-proxy';

const view = resolve('error.html');

export const handleError = (req: XP.ErrorRequest) => {
    // For non-404 errors, return a basic error message
    if (req.status !== 404) {
        const model = {
            status: req.status,
            message: req.message,
        };

        return {
            status: req.status,
            contentType: 'text/html; charset=UTF-8',
            body: thymeleafLib.render(view, model),
        };
    }

    // Get 404 from the frontend for request to master (from the public)
    if (req.request.branch === 'master') {
        return adminFrontendProxy(req.request, '/404');
    }

    // If the requested path is a customPath, or some other custom mapping that the frontend + sitecontent
    // pipeline can resolve, this should ensure it gets resolved (otherwise, this will also ultimately
    // return 404)
    const possiblePaths = req.request.rawPath.split('/www.nav.no');

    return adminFrontendProxy(req.request, possiblePaths[1] || possiblePaths[0]);
};
