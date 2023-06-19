import httpClient from '/lib/http-client';
import { URLS } from '../constants';
import { logger } from '../utils/logging';
import { getLocaleFromRepoId } from '../localization/layers-data';
import { getNodeVersions } from '../utils/version-utils';
import { getRepoConnection } from '../utils/repo-utils';
import { stripPathPrefix } from '../paths/path-utils';

// Used for checking if a request to the frontend looped back to this controller
const LOOPBACK_PARAM = 'fromXp';

// Requests from the archive preview are mapped to a target path prefixed with
// this segment, in the server vhost config
const ARCHIVE_VHOST_TARGET_PREFIX = '/__archive';

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

const getFrontendPath = (req: XP.Request) => {
    const contentPath = stripPathPrefix(req.rawPath.split(req.branch)[1] || '');
    if (!contentPath) {
        logger.error(`Unexpected request path: ${req.rawPath}`);
        return null;
    }

    logger.info(`Content path: ${contentPath}`);

    if (!contentPath.startsWith(ARCHIVE_VHOST_TARGET_PREFIX)) {
        return contentPath;
    }

    const archivedPath = contentPath.replace(ARCHIVE_VHOST_TARGET_PREFIX, '/archive');
    logger.info(`Archived path: ${archivedPath}`);

    const repoConnection = getRepoConnection({ branch: 'draft', repoId: req.repositoryId });
    const contentNode = repoConnection.get(archivedPath);

    logger.info(`Found in archive: ${contentNode.originalParentPath}/${contentNode.originalName}`);

    const version = getNodeVersions({
        nodeKey: contentNode._id,
        branch: 'draft',
        repoId: req.repositoryId,
    }).find((version) => version.nodePath.startsWith('/content'));

    if (!version) {
        logger.error(`No pre-archiving content version found for ${req.rawPath}`);
        return null;
    }

    const contentVersionNode = repoConnection.get({
        key: version.nodeId,
        versionId: version.versionId,
    });
    if (!contentVersionNode) {
        logger.error(
            `Content node not found for version ${JSON.stringify(
                version
            )} (this shouldn't be possible!)`
        );
        return null;
    }

    return `${archivedPath}?time=${contentVersionNode.modifiedTime}&id=${contentVersionNode._id}`;
};

// The legacy health check expects an html-response on /no/person
// "Nyheter" must be part of the response!
const healthCheckDummyResponse = () => {
    return {
        contentType: 'text/html; charset=UTF-8',
        body: '<html lang="no"><head><meta charset="utf-8"><title>Nav.no</title></head><body><div>Hei, jeg er en ex-forside. Her var det blant annet Nyheter og nyheter.</div></body></html>',
    };
};

// Proxy requests to the frontend application. Normally this will only be used in the portal-admin
// content studio previews and from the error controller
export const frontendProxy = (req: XP.Request, path?: string) => {
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

    const frontendPath = path || stripPathPrefix(req.rawPath.split(req.branch)[1] || '');
    if (!frontendPath) {
        return {
            contentType: 'text/html',
            body: `<div>Error: could not determine frontend path for ${req.url}</div>`,
            status: 200,
        };
    }

    const frontendUrl = `${URLS.FRONTEND_ORIGIN}${
        req.branch === 'draft' ? '/draft' : ''
    }${frontendPath}`;

    logger.info(`Requesting ${frontendUrl}`);

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
                [LOOPBACK_PARAM]: 'true',
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
