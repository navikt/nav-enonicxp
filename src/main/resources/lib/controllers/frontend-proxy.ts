import { Request } from '@enonic-types/core'
import httpClient from '/lib/http-client';
import * as portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/portal';
import { URLS } from '../constants';
import { logger } from '../utils/logging';
import { getLayersData } from '../localization/layers-data';
import { stripPathPrefix } from '../paths/path-utils';
import { isMedia } from '../utils/content-utils';

// Used for checking if a request to the frontend looped back to this controller
const LOOPBACK_PARAM = 'fromXp';

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

const mediaResponse = (content: Content) => {
    const url = portalLib.attachmentUrl({ id: content._id, download: true });

    return {
        contentType: 'text/html',
        body: `<div>Filer av typen "${content.type}" støtter ikke forhåndsvisning - <a href="${url}">Last ned filen</a></div>`,
        status: 200,
    };
};

// The legacy health check expects an html-response on /no/person
// "Nyheter" must be part of the response!
const healthCheckDummyResponse = () => {
    return {
        contentType: 'text/html; charset=UTF-8',
        body: '<html lang="no"><head><meta charset="utf-8"><title>Nav.no</title></head><body><div>Hei, jeg er en ex-forside. Her var det blant annet Nyheter og nyheter.</div></body></html>',
    };
};

const getFrontendUrl = (req: Request, path?: string) => {
    if (!req.branch) {
        return null;
    }
    const frontendPath = path || stripPathPrefix(req.rawPath.split(req.branch)[1] || '');

    // Archive requests have their own routing under the /archive path segment
    if (frontendPath.startsWith('/archive')) {
        return `${URLS.FRONTEND_ORIGIN}${frontendPath}`;
    }

    return `${URLS.FRONTEND_ORIGIN}${req.branch === 'draft' ? '/draft' : ''}${frontendPath}`;
};

// Proxy requests to the frontend application. Normally this will only be used in the portal-admin
// content studio previews and from the error controller
export const frontendProxy = (req: Request, path?: string) => {
    if (req.method === 'HEAD') {
        return {
            status: 200,
        };
    }

    const isLoopback = req.params[LOOPBACK_PARAM];
    if (isLoopback) {
        logger.warning(`Loopback to XP detected from path ${req.rawPath}`);
        return {
            contentType: 'text/html',
            body: `<div>Error: request to frontend looped back to XP</div>`,
            status: 200,
        };
    }

    // Ensures our legacy health-check still works after the old /no/person page is removed
    // TODO: remove this asap after the health-check has been updated
    if (req.mode === 'live' && req.url.endsWith('/no/person')) {
        logger.info('Is the old health check still in use? (Yes it is!)');
        return healthCheckDummyResponse();
    }

    const content = portalLib.getContent();

    if (content && isMedia(content)) {
        return mediaResponse(content);
    }

    const frontendUrl = getFrontendUrl(req, path);
    if (!frontendUrl) {
        return errorResponse('N/A', 500, 'No valid frontendUrl');
    }

    const repositoryId = req.repositoryId;
    if (!repositoryId) {
        return errorResponse(frontendUrl, 500, 'No valid repositoryId');
    }

    try {
        const response = httpClient.request({
            url: encodeURI(frontendUrl),
            contentType: 'text/html',
            connectionTimeout: 20000,
            readTimeout: 30000,
            headers: {
                secret: app.config.serviceSecret,
            },
            followRedirects: false,
            queryParams: {
                ...req.params,
                [LOOPBACK_PARAM]: 'true',
                mode: req.mode,
                locale: getLayersData().repoIdToLocaleMap[repositoryId],
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
