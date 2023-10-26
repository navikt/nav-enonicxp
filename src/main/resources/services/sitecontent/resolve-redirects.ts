import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { hasValidCustomPath } from '../../lib/paths/custom-paths/custom-path-utils';
import { runInContext } from '../../lib/context/run-in-context';
import { REDIRECTS_ROOT_PATH } from '../../lib/constants';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { getParentPath, stripPathPrefix } from '../../lib/paths/path-utils';
import { getPublicPath } from '../../lib/paths/public-path';
import { buildLocalePath, isContentLocalized } from '../../lib/localization/locale-utils';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { logger } from '../../lib/utils/logging';
import {
    getContentLocaleRedirectTarget,
    isContentPreviewOnly,
} from '../../lib/utils/content-utils';

const transformToRedirectResponse = ({
    content,
    target,
    type,
    isPermanent = false,
}: {
    content: Content;
    target: string;
    type: 'internal' | 'external';
    isPermanent?: boolean;
}) => {
    // We don't want every field from the raw content in the response, ie creator/modifier ids and other
    // fields purely for internal use
    const { _id, _path, createdTime, modifiedTime, displayName, language, publish } = content;

    const contentCommon = {
        _id,
        _path,
        createdTime,
        modifiedTime,
        displayName,
        language,
        publish,
        page: {},
    };

    return type === 'internal'
        ? {
              ...contentCommon,
              type: 'no.nav.navno:internal-link',
              data: {
                  target: { _path: target },
                  permanentRedirect: isPermanent,
                  redirectSubpaths: false,
              },
          }
        : {
              ...contentCommon,
              type: 'no.nav.navno:external-link',
              data: {
                  url: target,
                  permanentRedirect: isPermanent,
              },
          };
};

// The previewOnly x-data flag is used on content which should only be publicly accessible
// through the /utkast route in the frontend. Calls from this route comes with the "preview"
// query param. We also want this behaviour for pages with an external redirect url set.
const getSpecialPreviewResponse = (content: Content, requestedPath: string, isPreview: boolean) => {
    const isPreviewOnly = isContentPreviewOnly(content);
    const externalRedirectUrl = content.data?.externalProductUrl;

    if ((isPreviewOnly || !!externalRedirectUrl) === isPreview) {
        return null;
    }

    if (externalRedirectUrl) {
        return {
            response: transformToRedirectResponse({
                content,
                target: externalRedirectUrl,
                type: 'external',
            }),
        };
    }

    // If the content is flagged for preview only we want a 404 response. Otherwise, redirect to the
    // actual content url
    return {
        response: isPreviewOnly
            ? null
            : transformToRedirectResponse({ content, target: requestedPath, type: 'internal' }),
    };
};

// Note: There are legacy office pages still in effect that also have the
// content type office-information. As long as the enhetNr doesn't match up
// with any office-branch content, the next function will pass by these
// office pages.
const getOfficeInfoRedirect = (content: Content) => {
    if (content.type !== 'no.nav.navno:office-information') {
        return null;
    }

    const { enhetNr } = content.data.enhet;

    const foundOfficeContent = contentLib.query({
        start: 0,
        count: 1,
        contentTypes: ['no.nav.navno:office-branch'],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.enhetNr',
                        values: [enhetNr],
                    },
                },
            },
        },
    });

    if (foundOfficeContent.hits.length === 0) {
        return null;
    }

    // Try and use the new office branch name, but fall back to the old name if it
    // will return a 404 after redirect.
    const office = foundOfficeContent.hits[0];

    return transformToRedirectResponse({
        content,
        target: office._path,
        type: 'internal',
        isPermanent: true,
    });
};

export const getRedirectResponseIfApplicable = ({
    content,
    requestedPath,
    branch,
    locale,
    isPreview,
}: {
    content: Content;
    requestedPath: string;
    branch: RepoBranch;
    locale: string;
    isPreview: boolean;
}) => {
    const previewOnlyRedirect = getSpecialPreviewResponse(content, requestedPath, isPreview);
    if (previewOnlyRedirect) {
        return previewOnlyRedirect;
    }

    const officeInfoRedirect = getOfficeInfoRedirect(content);
    if (officeInfoRedirect) {
        return officeInfoRedirect;
    }

    const localeTarget = getContentLocaleRedirectTarget(content);
    if (localeTarget && localeTarget !== locale) {
        const targetContent = runInLocaleContext({ locale: localeTarget, branch }, () =>
            contentLib.get({ key: content._id })
        );

        if (targetContent && isContentLocalized(targetContent)) {
            return transformToRedirectResponse({
                content,
                target: getPublicPath(targetContent, localeTarget),
                type: 'internal',
            });
        } else {
            logger.error(
                `Layer redirect was set on ${content._id} to ${localeTarget} but the target locale content was not localized!`
            );
        }
    }

    // If the content has a custom path, we should redirect requests from the internal _path
    const shouldRedirectToCustomPath =
        hasValidCustomPath(content) &&
        requestedPath === buildLocalePath(content._path, locale) &&
        branch === 'master';
    if (shouldRedirectToCustomPath) {
        return transformToRedirectResponse({
            content,
            target: getPublicPath(content, locale),
            type: 'internal',
        });
    }

    return null;
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

    return transformToRedirectResponse({
        content: targetContent,
        target: targetContent._path,
        type: 'internal',
        isPermanent: true,
    });
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

export const getRedirectFallback = ({
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

        return redirectContent
            ? runInLocaleContext({ locale: redirectContent.language }, () =>
                  runSitecontentGuillotineQuery(redirectContent, branch)
              )
            : null;
    });
