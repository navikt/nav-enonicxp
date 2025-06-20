import { ErrorRequest } from '@enonic-types/core';
import thymeleafLib from '/lib/thymeleaf';
import { frontendProxy } from '../../lib/controllers/frontend-proxy';
import { NAVNO_ROOT_PATH } from '../../lib/constants';

const basicErrorView = resolve('error.html');

export const handleError = (req: ErrorRequest) => {
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

    // If the requested path originates from a consumer which does not include the site root prefix
    // it should still be resolvable
    // Ie, both of these should resolve to the same content if it exists:
    // /admin/site/inline/default/draft/www.nav.no/my-content-path
    // /admin/site/inline/default/draft/my-content-path
    const possiblePaths = req.request.rawPath.split(NAVNO_ROOT_PATH);

    return frontendProxy(req.request, possiblePaths[1] || possiblePaths[0]);
};
