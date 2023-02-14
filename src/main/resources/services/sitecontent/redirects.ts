import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { Locale, RepoBranch } from '../../types/common';
import { hasValidCustomPath } from '../../lib/custom-paths/custom-paths';
import { getParentPath, stripPathPrefix } from '../../lib/utils/nav-utils';
import { isUUID } from '../../lib/utils/uuid';
import { runInContext } from '../../lib/context/run-in-context';
import { redirectsRootPath } from '../../lib/constants';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { getLayersData } from '../../lib/localization/layers-data';

// If the content has a custom path and it is not the requested path
// we should redirect to the custom path
export const getCustomPathRedirectIfApplicable = ({
    content,
    requestedPath,
    branch,
    locale,
}: {
    content: Content;
    requestedPath: string;
    branch: RepoBranch;
    locale: Locale;
}) => {
    if (hasValidCustomPath(content) && requestedPath === content._path && branch === 'master') {
        const { defaultLocale } = getLayersData();

        return {
            ...content,
            __typename: 'no_nav_navno_InternalLink',
            type: 'no.nav.navno:internal-link',
            data: {
                target: {
                    _path: `${content.data.customPath}${
                        locale && locale !== defaultLocale ? `/${locale}` : ''
                    }`,
                },
            },
            page: undefined,
        } as unknown as Content<'no.nav.navno:internal-link'>;
    }

    return null;
};

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

export const getRedirectContent = (idOrPath: string, branch: RepoBranch): Content | null => {
    if (isUUID(idOrPath)) {
        return null;
    }

    const redirectFromLegacyPath = runInContext({ branch }, () =>
        getRedirectFromLegacyPath(idOrPath)
    );

    if (redirectFromLegacyPath) {
        return redirectFromLegacyPath;
    }

    const redirectPath = stripPathPrefix(idOrPath);
    if (!redirectPath) {
        return null;
    }

    // Gets content from the /redirects folder
    const redirectContent = runInContext({ branch }, () =>
        contentLib.get({ key: `${redirectsRootPath}${redirectPath}` })
    );
    if (redirectContent) {
        return runSitecontentGuillotineQuery(redirectContent, branch);
    }

    const parentRedirectContent = runInContext({ branch }, () =>
        getParentRedirectContent(idOrPath)
    );
    if (parentRedirectContent) {
        return runSitecontentGuillotineQuery(parentRedirectContent, branch);
    }

    const parentRedirectContentFromRedirectsFolder = runInContext({ branch }, () =>
        getParentRedirectContent(`${redirectsRootPath}${redirectPath}`)
    );
    if (parentRedirectContentFromRedirectsFolder) {
        return runSitecontentGuillotineQuery(parentRedirectContentFromRedirectsFolder, branch);
    }

    return null;
};
