import httpClient from '/lib/http-client';
import taskLib from '/lib/xp/task';
import clusterLib from '/lib/xp/cluster';
import { Content } from '/lib/xp/content';
import { urls } from '../constants';
import { getFrontendPathname, isRenderedType } from './utils';
import { getCustomPathFromContent } from '../custom-paths/custom-paths';

const numRetries = 3;
const timeoutMs = 10000;

const requestInvalidatePaths = (paths: string[], eventId: string, retriesLeft = numRetries) => {
    try {
        const response = httpClient.request({
            url: `${urls.revalidatorProxyOrigin}/revalidator-proxy`,
            method: 'POST',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
                eventid: eventId,
            },
            body: JSON.stringify({ paths }),
        });

        if (response.status >= 400) {
            if (retriesLeft > 0) {
                requestInvalidatePaths(paths, eventId, retriesLeft - 1);
            } else {
                log.error(
                    `Revalidate request to frontend failed for ${eventId} - ${response.body}`
                );
            }
        } else {
            log.info(
                `Revalidate request to frontend acknowledged for ${eventId} - ${response.body}`
            );
        }
    } catch (e) {
        if (retriesLeft > 0) {
            requestInvalidatePaths(paths, eventId, retriesLeft - 1);
        } else {
            log.error(`Revalidate request to frontend failed for ${eventId} - ${e}`);
        }
    }
};

const requestWipeAll = (eventId: string, retriesLeft = numRetries) => {
    try {
        httpClient.request({
            url: `${urls.revalidatorProxyOrigin}/revalidator-proxy/wipe-all`,
            method: 'GET',
            connectionTimeout: timeoutMs,
            contentType: 'application/json',
            headers: {
                secret: app.config.serviceSecret,
                eventid: eventId,
            },
        });
        log.info('Wipe-all request to frontend acknowledged');
    } catch (e) {
        if (retriesLeft > 0) {
            requestWipeAll(eventId, retriesLeft - 1);
        } else {
            log.error(`Wipe-all request to frontend failed - ${e}`);
        }
    }
};

export const frontendCacheInvalidateContent = ({
    contents = [],
    paths = [],
    eventId,
}: {
    contents?: Content[];
    paths?: string[];
    eventId: string;
}) => {
    if (clusterLib.isMaster()) {
        taskLib.executeFunction({
            description: `Send invalidate with event id ${eventId}`,
            func: () => {
                // Ensure the paths we send to the frontend for invalidation are of the same format as used
                // by the frontend. Also filter out any content types that aren't rendered/cached by the frontend.
                const frontendPaths = [
                    ...contents
                        .filter((content) => isRenderedType(content))
                        .map(
                            (content) =>
                                getCustomPathFromContent(content._path) ||
                                getFrontendPathname(content._path)
                        ),
                    ...paths.map(getFrontendPathname),
                ];

                if (frontendPaths.length === 0) {
                    log.info(
                        `Nothing to invalidate for event ${eventId} - aborting frontend request`
                    );
                    return;
                }

                requestInvalidatePaths(frontendPaths, eventId);
            },
        });
    }
};

export const frontendCacheWipeAll = (eventId: string) => {
    if (clusterLib.isMaster()) {
        taskLib.executeFunction({
            description: `Send wipe-all`,
            func: () => {
                requestWipeAll(eventId);
            },
        });
    }
};
