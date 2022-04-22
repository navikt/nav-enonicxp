import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { guillotineContentQuery } from '../../lib/guillotine/queries/sitecontent/sitecontent-query';
import { redirectsRootPath } from '../../lib/constants';
import { getModifiedTimeIncludingFragments } from '../../lib/fragments/find-fragments';
import {
    getInternalContentPathFromCustomPath,
    shouldRedirectToCustomPath,
} from '../../lib/custom-paths/custom-paths';
import { getNotifications } from '../../lib/guillotine/queries/notifications';
import { isMedia, stripPathPrefix } from '../../lib/utils/nav-utils';
import { isUUID } from '../../lib/utils/uuid';
import { validateTimestampConsistency } from '../../lib/time-travel/consistency-check';

const { runWithTimeTravel, unhookTimeTravel } = require('/lib/time-travel/run-with-time-travel');

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
        count: 2,
        query: `x.no-nav-navno.cmsContent.contentKey LIKE "${legacyCmsKey}"`,
    }).hits;

    const targetContent = legacyHits[0];

    if (!targetContent) {
        return null;
    }

    if (legacyHits.length > 1) {
        log.error(`Multiple contents found with legacy key ${legacyCmsKey}`);
    }

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

    if (!redirectContent) {
        return null;
    }

    return guillotineContentQuery(redirectContent, branch);
};

// Get content from a specific datetime (used for requests from the internal version history selector)
const getContentVersionFromTime = (
    contentRef: string,
    branch: RepoBranch,
    dateTime: string
): Content | null => {
    const contentRaw = runInBranchContext(() => contentLib.get({ key: contentRef }), branch);
    if (!contentRaw) {
        return null;
    }

    try {
        return runWithTimeTravel(dateTime, branch, contentRaw._id, () => {
            const content = guillotineContentQuery(contentRaw, branch);
            if (!content) {
                return null;
            }

            return {
                ...content,
                livePath: contentRaw._path,
            };
        });
    } catch (e) {
        log.warning(`Time travel: Error retrieving data from version history: ${e}`);
        return null;
    }
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
        } as Content<'no.nav.navno:internal-link'>;
    }

    const content = guillotineContentQuery(baseContent, branch);

    // Consistency check to ensure our version-history hack isn't affecting normal requests
    if (!validateTimestampConsistency(contentRef, content, branch)) {
        if (retries > 0) {
            log.error(
                `Timestamp consistency check failed - Retrying ${retries} more time${
                    retries > 1 ? 's' : ''
                }`
            );
            return getContentOrRedirect(contentRef, branch, retries - 1);
        }

        log.error(`Time travel permanently disabled on this node`);
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
): Content | null => {
    if (datetime) {
        return getContentVersionFromTime(requestedPathOrId, branch, datetime);
    }

    const content = getContentOrRedirect(requestedPathOrId, branch);

    if (!content) {
        return null;
    }

    if (isMedia(content)) {
        return content;
    }

    const notifications = getNotifications(content._path);

    return {
        ...content,
        ...(notifications && { notifications }),
    };
};
