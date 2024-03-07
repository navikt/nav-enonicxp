import { isValidBranch } from '../../lib/context/branches';
import { sitecontentPublicResponse } from './public/public-response';
import { logger } from '../../lib/utils/logging';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { RepoBranch } from '../../types/common';
import { SITECONTENT_404_MSG_PREFIX } from '../../lib/constants';
import { sitecontentDraftResponse } from './draft/draft-response';
import { SitecontentResponse } from './common/content-response';
import { isWellFormedContentRef } from '../../lib/paths/path-utils';

type SiteContentParams = {
    id: string;
    locale?: string;
    branch?: RepoBranch;
    preview?: 'true';
    cacheKey?: string;
};

// We should only generate a cache key for the request if it included the "cacheKey" param
// Requests without this param should not be cached
// The cacheKey param (cacheVersionKey) is used for versioning the cache, and is changed every time
// a content is modified
const buildReqSpecificCacheKey = ({
    id,
    cacheKey: cacheVersionKey,
    locale,
    branch,
    preview,
}: SiteContentParams) =>
    cacheVersionKey
        ? [id, cacheVersionKey, locale, branch, preview].filter(Boolean).join('_')
        : undefined;

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

    // id can be a content UUID, or a content path, ie. /www.nav.no/no/person
    const {
        id: idOrPath,
        locale,
        branch = 'master',
        preview,
    } = req.params as unknown as Partial<SiteContentParams>;

    if (!idOrPath) {
        return {
            status: 400,
            body: {
                message: 'No content id or path was provided',
            },
            contentType: 'application/json',
        };
    }

    if (!isValidBranch(branch)) {
        return {
            status: 400,
            body: {
                message: 'Invalid branch specified',
            },
            contentType: 'application/json',
        };
    }

    if (!isWellFormedContentRef(idOrPath)) {
        logger.warning(`Id or path failed to validate: ${idOrPath}`);
        return {
            status: 400,
            body: {
                message: 'URIError: Invalid id parameter',
            },
            contentType: 'application/json',
        };
    }

    try {
        const responseBody: SitecontentResponse =
            branch === 'draft'
                ? sitecontentDraftResponse({ idOrPath, requestedLocale: locale })
                : sitecontentPublicResponse({
                      idOrPath,
                      isPreview: preview === 'true',
                      cacheKey: buildReqSpecificCacheKey(req.params as SiteContentParams),
                  });

        if (!responseBody) {
            logger.info(`Content not found: ${idOrPath}`);
            return {
                status: 404,
                body: {
                    message: SITECONTENT_404_MSG_PREFIX,
                },
                contentType: 'application/json',
            };
        }

        return {
            status: 200,
            body: responseBody,
            contentType: 'application/json',
        };
    } catch (e) {
        const msg = `Error fetching content for ${idOrPath} - ${e}`;

        if (branch === 'master') {
            logger.critical(msg);
        } else {
            logger.error(msg);
        }

        return {
            status: 500,
            body: {
                message: `Server error - ${msg}`,
            },
            contentType: 'application/json',
        };
    }
};
