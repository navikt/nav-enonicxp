import { Request } from '@enonic-types/core';
import { getLayersData } from 'lib/localization/layers-data';
import { logger } from 'lib/utils/logging';
import { validateServiceSecretHeader } from 'lib/utils/auth-utils';
import { SITECONTENT_404_MSG_PREFIX } from 'lib/constants';
import { runInContext } from 'lib/context/run-in-context';
import { getArchivedContent } from 'lib/external-archive/get-archived-content';
import { forceString } from 'lib/utils/string-utils';

export const get = (req: Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const
        idOrArchivedPath= forceString(req.params.idOrArchivedPath),
        locale = forceString(req.params.locale),
        time = forceString(req.params.time);

    if (!idOrArchivedPath) {
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
        const content = runInContext({ asAdmin: true, branch: 'draft', repository: repoId }, () =>
            getArchivedContent(idOrArchivedPath, repoId, time)
        );

        if (!content) {
            const msg = `${SITECONTENT_404_MSG_PREFIX} in archive: ${idOrArchivedPath}`;
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
        const msg = `Error fetching content version for ${idOrArchivedPath} - ${e}`;

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
