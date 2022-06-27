import portalLib from '/lib/xp/portal';
import httpClient from '/lib/http-client';
import { urls } from '../constants';
import { stringArrayToSet, stripPathPrefix } from '../utils/nav-utils';
import { logger } from '../utils/logging';
import { contentTypesRenderedByEditorFrontend } from '../contenttype-lists';

const loopbackCheckParam = 'fromXp';

const contentTypesForFrontendProxy = stringArrayToSet(contentTypesRenderedByEditorFrontend);

const noRenderResponse = (): XP.Response => ({
    status: 200,
    contentType: 'text/html; charset=UTF-8',
    body: '<div style="text-align: center;font-size: 2rem"><span>Ingen forhåndsvisning tilgjengelig for denne innholdstypen</span></div>',
});

const errorResponse = (url: string, status: number, message: string) => {
    const msg = `Failed to fetch from frontend: ${url} - ${status}: ${message}`;
    if (status >= 400) {
        logger.error(msg);
    }

    return {
        contentType: 'text/html; charset=UTF-8',
        body: `<div>${msg}</div>`,
        status,
    };
};

// Prevents outdated health-check from blocking routing to our servers...
// TODO: remove this asap
const healthCheckDummyResponse = () => {
    return {
        contentType: 'text/html; charset=UTF-8',
        body: '<!DOCTYPE html><html lang="no"><head><meta charset="utf-8"><title>Nav.no</title></head><body><div>Hello world!</div></body></html>',
    };
};

// Proxy requests to XP to the frontend. Normally this will only be used in the portal-admin
// content studio previews and from the error controller
export const frontendProxy = (req: XP.Request, path?: string) => {
    if (req.method === 'HEAD') {
        return {
            status: 200,
        };
    }

    const isLoopback = req.params[loopbackCheckParam];
    if (isLoopback) {
        logger.warning(`Loopback to XP detected from path ${req.rawPath}`);
        return {
            contentType: 'text/html',
            body: `<div>Error: request to frontend looped back to XP</div>`,
            status: 200,
        };
    }

    if (!path) {
        const content = portalLib.getContent();

        log.info(req.url);
        if (req.url.endsWith('/no/person') && content?.type !== 'no.nav.navno:dynamic-page') {
            log.info(`Returning dummy response for ${req.url}`);
            return healthCheckDummyResponse();
        }

        if (!contentTypesForFrontendProxy[content?.type]) {
            return noRenderResponse();
        }
    }

    const pathStartIndex = req.rawPath.indexOf(req.branch) + req.branch.length;
    const contentPath = path || stripPathPrefix(req.rawPath.slice(pathStartIndex));
    const frontendUrl = `${urls.frontendOrigin}${
        req.branch === 'draft' ? '/draft' : ''
    }${contentPath}`;

    try {
        const response = httpClient.request({
            url: frontendUrl,
            contentType: 'text/html',
            connectionTimeout: 5000,
            headers: {
                secret: app.config.serviceSecret,
            },
            followRedirects: false,
            queryParams: {
                ...req.params,
                [loopbackCheckParam]: 'true',
                mode: req.mode,
            },
        });

        if (!response) {
            return errorResponse(frontendUrl, 500, 'No response from HTTP client');
        }

        const { status, message } = response;

        if (status >= 400 && status !== 404) {
            logger.warning(
                `Error response from frontend for ${frontendUrl}: ${status} - ${message}`
            );
        }

        // Do not send redirect-responses to the content-studio editor view,
        // as it may cause iframe cross-origin errors
        if (req.mode === 'edit' && status >= 300 && status < 400) {
            return errorResponse(frontendUrl, status, 'Redirects are not supported in editor view');
        }

        return response;
    } catch (e) {
        return errorResponse(frontendUrl, 500, `Exception: ${e}`);
    }
};

export const get = frontendProxy;
export const handleError = frontendProxy;
