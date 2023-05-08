import httpClient from '/lib/http-client';
import { URLS } from '../constants';
import { logger } from '../utils/logging';
import { getLocaleFromRepoId } from '../localization/layers-data';
import { stripPathPrefix } from '../paths/path-utils';

const LOOKBACK_CHECK_PARAM = 'fromXp';

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

// Proxy requests to XP to the frontend. Normally this will only be used in the portal-admin
// content studio previews and from the error controller
export const frontendProxy = (req: XP.Request, path?: string) => {
    if (req.method === 'HEAD') {
        return {
            status: 200,
        };
    }

    const isLoopback = req.params[LOOKBACK_CHECK_PARAM];
    if (isLoopback) {
        logger.warning(`Loopback to XP detected from path ${req.rawPath}`);
        return {
            contentType: 'text/html',
            body: `<div>Error: request to frontend looped back to XP</div>`,
            status: 200,
        };
    }

    const pathStartIndex = req.rawPath.indexOf(req.branch) + req.branch.length;
    const contentPath = path || stripPathPrefix(req.rawPath.slice(pathStartIndex));
    const frontendUrl = `${
        req.branch === 'draft' ? `${URLS.FRONTEND_PREVIEW_ORIGIN}/draft` : URLS.FRONTEND_ORIGIN
    }${contentPath}`;

    try {
        const response = httpClient.request({
            url: frontendUrl,
            contentType: 'text/html',
            connectionTimeout: 15000,
            headers: {
                secret: app.config.serviceSecret,
            },
            followRedirects: false,
            queryParams: {
                ...req.params,
                [LOOKBACK_CHECK_PARAM]: 'true',
                mode: req.mode,
                locale: getLocaleFromRepoId(req.repositoryId),
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
