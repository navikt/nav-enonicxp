import { getLayersData } from '../../lib/localization/layers-data';
import { getMostRecentLiveContent } from '../../lib/time-travel/get-content-from-datetime';
import { logger } from '../../lib/utils/logging';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { SITECONTENT_404_MSG_PREFIX } from '../../lib/constants';

export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const { id, locale } = req.params;

    if (!id) {
        return {
            status: 400,
            body: {
                message: 'No valid id parameter was provided',
            },
            contentType: 'application/json',
        };
    }

    const { localeToRepoIdMap, defaultLocale } = getLayersData();

    const repoId = localeToRepoIdMap[locale || defaultLocale];

    try {
        const content = getMostRecentLiveContent(id, repoId);

        if (!content) {
            const msg = `${SITECONTENT_404_MSG_PREFIX} in archive: ${id}`;
            logger.info(msg);

            return {
                status: 404,
                body: {
                    message: msg,
                },
                contentType: 'application/json',
            };
        }

        return {
            status: 200,
            body: content,
            contentType: 'application/json',
        };
    } catch (e) {
        const msg = `Error fetching content version for ${id} - ${e}`;

        logger.error(msg);

        return {
            status: 500,
            body: {
                message: `Server error - ${msg}`,
            },
            contentType: 'application/json',
        };
    }
};
