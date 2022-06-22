import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { redirectsRootPath } from '../../lib/constants';
import { getModifiedTimeIncludingFragments } from '../../lib/utils/fragment-utils';
import {
    getInternalContentPathFromCustomPath,
    shouldRedirectToCustomPath,
} from '../../lib/custom-paths/custom-paths';
import { getParentPath, isMedia, stripPathPrefix } from '../../lib/utils/nav-utils';
import { isUUID } from '../../lib/utils/uuid';
import { validateTimestampConsistency } from '../../lib/time-travel/consistency-check';
import { getContentVersionFromDateTime } from '../../lib/time-travel/get-content-from-datetime';
import { unhookTimeTravel } from '../../lib/time-travel/time-travel-hooks';
import { getPublishedVersionTimestamps } from '../../lib/utils/version-utils';
import { logger } from '../../lib/utils/logging';

// The old Enonic CMS had urls suffixed with <contentKey>.cms
// This contentKey was saved as an x-data field after the migration to XP
// Check if a path matches this pattern and return the content with the contentKey
// if it exists
const getRedirectFromLegacyPath = (path: string): Content | null => {
    const legacyCmsKeyMatch = /\d+(?=\.cms$)/.exec(path);
    if (!legacyCmsKeyMatch) {
        return null;
    }

    const legacyCmsKey = legacyCmsKeyMatch[0];

    const legacyHits = contentLib.query({
        count: 100,
        sort: 'createdTime ASC',
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'x.no-nav-navno.cmsContent.contentKey',
                        values: [legacyCmsKey],
                    },
                },
            },
        },
    }).hits;

    if (legacyHits.length === 0) {
        return null;
    }

    // Sometimes multiple contents have the same legacy key, usually due to duplication
    // for localization purposes. Return the oldest content.
    const targetContent = legacyHits[0];

    return {
        ...targetContent,
        // @ts-ignore (__typename is not a content field but is presently used by the frontend)
        __typename: 'no_nav_navno_InternalLink',
        type: 'no.nav.navno:internal-link',
        data: {
            target: { _path: targetContent._path },
            permanentRedirect: true,
        },
    } as Content<'no.nav.navno:internal-link'>;
};

// Find the nearest parent for a not-found content. If it is an internal link with the
// redirectSubpaths flag, use this as a redirect
const getParentRedirectId = (path: string): null | Content => {
    if (!path) {
        return null;
    }

    const parentPath = getParentPath(path);
    if (!parentPath) {
        return null;
    }

    const parentContent = contentLib.get({ key: parentPath });
    if (!parentContent) {
        return getParentRedirectId(parentPath);
    }

    if (
        parentContent.type === 'no.nav.navno:internal-link' &&
        parentContent.data.redirectSubpaths
    ) {
        return parentContent;
    }

    return null;
};

const getRedirectContent = (idOrPath: string, branch: RepoBranch): Content | null => {
    if (isUUID(idOrPath)) {
        return null;
    }

    const redirectFromLegacyPath = runInBranchContext(
        () => getRedirectFromLegacyPath(idOrPath),
        branch
    );

    if (redirectFromLegacyPath) {
        return redirectFromLegacyPath;
    }

    const redirectPath = stripPathPrefix(idOrPath);

    if (!redirectPath) {
        return null;
    }

    // Gets content from the /redirects folder outside the site content tree
    const redirectContent = runInBranchContext(
        () => contentLib.get({ key: `${redirectsRootPath}${redirectPath}` }),
        branch
    );

    if (redirectContent) {
        return runSitecontentGuillotineQuery(redirectContent, branch);
    }

    const parentRedirectContent = runInBranchContext(() => getParentRedirectId(idOrPath), branch);
    if (parentRedirectContent) {
        return runSitecontentGuillotineQuery(parentRedirectContent, branch);
    }

    return null;
};

const getContentOrRedirect = (
    requestedPathOrId: string,
    branch: RepoBranch,
    retries = 2
): Content | null => {
    const contentRef = getInternalContentPathFromCustomPath(requestedPathOrId) || requestedPathOrId;
    const baseContent = runInBranchContext(() => contentLib.get({ key: contentRef }), branch);

    // If the content was not found, check if there are any applicable redirects
    // for the requested path/id
    if (!baseContent) {
        return getRedirectContent(contentRef, branch);
    }

    // If the content has a custom path, we generally want to redirect requests from the internal path
    if (shouldRedirectToCustomPath(baseContent, requestedPathOrId, branch)) {
        return {
            ...baseContent,
            // @ts-ignore (__typename is not a content field but is presently used by the frontend)
            __typename: 'no_nav_navno_InternalLink',
            type: 'no.nav.navno:internal-link',
            data: { target: { _path: baseContent.data.customPath } },
            page: undefined,
        } as unknown as Content<'no.nav.navno:internal-link'>;
    }

    const content = runSitecontentGuillotineQuery(baseContent, branch);

    // Consistency check to ensure our version-history hack isn't affecting normal requests
    if (!validateTimestampConsistency(contentRef, content, branch)) {
        if (retries > 0) {
            logger.error(
                `Timestamp consistency check failed - Retrying ${retries} more time${
                    retries > 1 ? 's' : ''
                }`
            );
            return getContentOrRedirect(contentRef, branch, retries - 1);
        }

        logger.critical(`Time travel permanently disabled on this node`);
        unhookTimeTravel();
        return getContentOrRedirect(contentRef, branch);
    }

    if (!content) {
        return null;
    }

    return {
        ...content,
        // modifiedTime should also take any fragments on the page into account
        modifiedTime: getModifiedTimeIncludingFragments(contentRef, branch),
    };
};

export const getSitecontentResponse = (
    requestedPathOrId: string,
    branch: RepoBranch,
    datetime?: string
) => {
    if (datetime) {
        return getContentVersionFromDateTime(requestedPathOrId, branch, datetime);
    }

    const content = getContentOrRedirect(requestedPathOrId, branch);

    if (!content) {
        return null;
    }

    if (isMedia(content)) {
        return content;
    }

    const versionTimestamps = getPublishedVersionTimestamps(content._id, branch);

    return {
        ...content,
        versionTimestamps,
    };
};
