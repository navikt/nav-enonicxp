import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { hasValidCustomPath } from '../../lib/paths/custom-paths/custom-path-utils';
import { runInContext } from '../../lib/context/run-in-context';
import { REDIRECTS_ROOT_PATH } from '../../lib/constants';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { getParentPath, stripPathPrefix } from '../../lib/paths/path-utils';
import { getPublicPath } from '../../lib/paths/public-path';

// If the content has a custom path, we should redirect requests from the internal _path
export const getCustomPathRedirectIfApplicable = ({
    content,
    requestedPath,
    branch,
    locale,
}: {
    content: Content;
    requestedPath: string;
    branch: RepoBranch;
    locale: string;
}) => {
    const shouldRedirect =
        hasValidCustomPath(content) && requestedPath === content._path && branch === 'master';

    return shouldRedirect
        ? {
              ...content,
              type: 'no.nav.navno:internal-link',
              data: {
                  target: {
                      _path: getPublicPath(content, locale),
                  },
              },
              page: undefined,
          }
        : null;
};

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

    return {
        ...targetContent,
        type: 'no.nav.navno:internal-link',
        data: {
            target: { _path: targetContent._path },
            permanentRedirect: true,
        },
    };
};

// Find the nearest parent for a not-found content. If it is an internal link with the
// redirectSubpaths flag, use this as a redirect
const getParentRedirectContent = (path: string): null | Content => {
    if (!path) {
        return null;
    }

    const parentPath = getParentPath(path);
    if (!parentPath) {
        return null;
    }

    const parentContent = contentLib.get({ key: parentPath });
    if (!parentContent) {
        return getParentRedirectContent(parentPath);
    }

    if (
        parentContent.type === 'no.nav.navno:internal-link' &&
        parentContent.data.redirectSubpaths
    ) {
        return parentContent;
    }

    return null;
};

const getContentFromRedirectsFolder = (path: string) =>
    contentLib.get({ key: `${REDIRECTS_ROOT_PATH}${path}` });

export const getRedirectContent = ({
    pathRequested,
    branch,
}: {
    pathRequested: string;
    branch: RepoBranch;
}) =>
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

        return redirectContent ? runSitecontentGuillotineQuery(redirectContent, branch) : null;
    });
