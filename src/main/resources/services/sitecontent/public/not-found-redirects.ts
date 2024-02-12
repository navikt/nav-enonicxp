import * as contentLib from '/lib/xp/content';
import { Content, CONTENT_ROOT_PATH } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { runInContext } from '../../../lib/context/run-in-context';
import { stripLeadingAndTrailingSlash, stripPathPrefix } from '../../../lib/paths/path-utils';
import { REDIRECTS_ROOT_PATH } from '../../../lib/constants';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { runSitecontentGuillotineQuery } from '../../../lib/guillotine/queries/run-sitecontent-query';
import { transformToRedirect } from '../common/transform-to-redirect';
import { SitecontentResponse } from '../common/content-response';

const MAX_PARENT_PATH_LENGTH = 10;

// The old Enonic CMS had urls suffixed with <contentKey>.cms
// This contentKey was saved as an x-data field after the migration to XP
// Check if a path matches this pattern and return the content with the contentKey
// if it exists
const getRedirectFromLegacyPath = (path: string) => {
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

    return transformToRedirect({
        content: targetContent,
        target: targetContent._path,
        type: 'internal',
        isPermanent: true,
    });
};

// Finds the nearest ancestor with the internal link content type + redirectSubpaths flag
// Use this as a redirect if found
const getParentRedirectContent = (path: string): null | Content => {
    if (!path) {
        return null;
    }

    const parentPathSegments = stripLeadingAndTrailingSlash(path)
        .split('/')
        .slice(0, -1)
        .slice(0, MAX_PARENT_PATH_LENGTH);

    if (parentPathSegments.length === 0) {
        return null;
    }

    const ancestorNodePaths = parentPathSegments.map(
        (_, index, ancestorPath) =>
            `${CONTENT_ROOT_PATH}/${ancestorPath.slice(0, index + 1).join('/')}`
    );

    const parentContent = contentLib.query({
        count: 1,
        sort: '_path DESC',
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.redirectSubpaths',
                            values: ['true'],
                        },
                    },
                    {
                        hasValue: {
                            field: 'type',
                            values: ['no.nav.navno:internal-link'],
                        },
                    },
                    {
                        hasValue: {
                            field: '_path',
                            values: ancestorNodePaths,
                        },
                    },
                ],
            },
        },
    }).hits[0];

    return parentContent || null;
};

const getContentFromRedirectsFolder = (path: string) =>
    contentLib.get({ key: `${REDIRECTS_ROOT_PATH}${path}` });

export const sitecontentNotFoundRedirect = ({
    pathRequested,
    branch,
}: {
    pathRequested: string;
    branch: RepoBranch;
}): SitecontentResponse =>
    runInContext({ branch }, () => {
        const redirectFromLegacyPath = getRedirectFromLegacyPath(pathRequested);
        if (redirectFromLegacyPath) {
            return redirectFromLegacyPath;
        }

        const strippedPath = stripPathPrefix(pathRequested);

        // This order of lookups should be preserved. In the event of overlapping matches, we want the order
        // of precedence to be:
        // 1. A direct match in the redirects folder
        // 2. A parent match in the regular content structure
        // 3. A parent match in the redirects folder
        const redirectContent =
            getContentFromRedirectsFolder(strippedPath) ||
            getParentRedirectContent(pathRequested) ||
            getParentRedirectContent(`${REDIRECTS_ROOT_PATH}${strippedPath}`);

        return redirectContent
            ? runInLocaleContext({ locale: redirectContent.language }, () =>
                  runSitecontentGuillotineQuery(redirectContent, branch)
              )
            : null;
    });
