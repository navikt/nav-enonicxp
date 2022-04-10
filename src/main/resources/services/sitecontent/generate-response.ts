import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { runContentQuery } from '../../lib/guillotine/queries/sitecontent/sitecontent-query';
import { redirectsPath } from '../../lib/constants';
import { getModifiedTimeIncludingFragments } from '../../lib/fragments/find-fragments';
import {
    getInternalContentPathFromCustomPath,
    shouldRedirectToCustomPath,
} from '../../lib/custom-paths/custom-paths';
import { getNotifications } from '../../lib/guillotine/queries/notifications';

const { runWithTimeTravel } = require('/lib/time-travel/run-with-time-travel');
const { unhookTimeTravel } = require('/lib/time-travel/run-with-time-travel');
const { validateTimestampConsistency } = require('/lib/time-travel/consistency-check');

const isMedia = (content: Content) => content.type.startsWith('media:');

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

    if (legacyHits.length > 1) {
        log.error(`Multiple contents found with legacy key ${legacyCmsKey}`);
    }

    const targetContent = legacyHits[0];

    if (!targetContent) {
        return null;
    }

    return {
        ...targetContent,
        // @ts-ignore
        __typename: 'no_nav_navno_InternalLink',
        type: 'no.nav.navno:internal-link',
        data: {
            target: { _path: targetContent._path },
            permanentRedirect: true,
        },
    } as Content<'no.nav.navno:internal-link'>;
};

// Gets content from the /redirects folder outside the site content tree
export const getRedirectContent = (idOrPath: string, branch: RepoBranch): Content | null => {
    const redirectFromLegacyPath = runInBranchContext(
        () => getRedirectFromLegacyPath(idOrPath),
        branch
    );
    if (redirectFromLegacyPath) {
        return redirectFromLegacyPath;
    }

    const pathSegments = idOrPath.split('/');
    const shortUrlPath = pathSegments.length === 3 && pathSegments[2];

    if (shortUrlPath) {
        return runContentQuery(`${redirectsPath}/${shortUrlPath}`, branch);
    }

    return null;
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

    const contentId = contentRaw._id;

    try {
        return runWithTimeTravel(dateTime, branch, contentId, () => {
            const content = runContentQuery(contentId, branch);
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
    contentRef: string,
    branch: RepoBranch,
    retries = 2
): Content | null => {
    const content = runContentQuery(contentRef, branch);

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

    // If the content was not found, check if there are any applicable redirects
    // for the requested path/id
    if (!content) {
        return getRedirectContent(contentRef, branch);
    }

    // If the content has a custom path, we generally want to redirect requests from the internal path
    if (shouldRedirectToCustomPath(content, contentRef, branch)) {
        return {
            ...content,
            // @ts-ignore
            __typename: 'no_nav_navno_InternalLink',
            type: 'no.nav.navno:internal-link',
            data: { target: { _path: content.data.customPath } },
            page: undefined,
        } as Content<'no.nav.navno:internal-link'>;
    }

    return {
        ...content,
        // modifiedTime should also take any fragments on the page into account
        modifiedTime: getModifiedTimeIncludingFragments(contentRef, branch),
    };
};

export const generateSitecontentResponse = (
    requestedPathOrId: string,
    branch: RepoBranch,
    datetime?: string
): Content | null => {
    const contentRef = getInternalContentPathFromCustomPath(requestedPathOrId) || requestedPathOrId;

    if (datetime) {
        return getContentVersionFromTime(contentRef, branch, datetime);
    }

    const content = getContentOrRedirect(contentRef, branch);

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
