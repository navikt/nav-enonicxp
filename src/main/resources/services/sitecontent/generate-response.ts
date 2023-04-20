import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { COMPONENT_APP_KEY } from '../../lib/constants';
import { getModifiedTimeIncludingFragments } from '../../lib/utils/fragment-utils';
import { isUUID } from '../../lib/utils/uuid';
import { validateTimestampConsistency } from '../../lib/time-travel/consistency-check';
import { unhookTimeTravel } from '../../lib/time-travel/time-travel-hooks';
import { logger } from '../../lib/utils/logging';
import { getLayersData, isValidLocale } from '../../lib/localization/layers-data';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { resolvePathToTarget } from '../../lib/localization/locale-paths';
import {
    transformToRedirectResponse,
    getCustomPathRedirectIfApplicable,
    getRedirectContent,
} from './resolve-redirects';
import { getLanguageVersions } from '../../lib/localization/resolve-language-versions';
import { contentTypesRenderedByEditorFrontend } from '../../lib/contenttype-lists';
import { stringArrayToSet } from '../../lib/utils/array-utils';

const contentTypesForGuillotineQuery = stringArrayToSet(contentTypesRenderedByEditorFrontend);

// The previewOnly x-data flag is used on content which should only be publicly accessible
// through the /utkast route in the frontend. Calls from this route comes with the "preview"
// query param. We also want this behaviour for pages with an external redirect url set.
const getSpecialPreviewResponseIfApplicable = (
    content: Content<any>,
    requestedPath: string,
    isPreview: boolean
) => {
    // During pilot phase, we want office branch pages to only be visible as a preview.
    // When the pilot is over and office pages are live, we can remove this check.
    const contentIsOfficeBranch = content.type === 'no.nav.navno:office-branch';

    const contentIsPreviewOnly =
        !!content.x?.[COMPONENT_APP_KEY]?.previewOnly?.previewOnly || contentIsOfficeBranch;
    const externalRedirectUrl = content.data?.externalProductUrl;

    if ((contentIsPreviewOnly || !!externalRedirectUrl) === isPreview) {
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
        response: contentIsPreviewOnly
            ? null
            : transformToRedirectResponse({ content, target: requestedPath, type: 'internal' }),
    };
};

// Resolve the base content to a fully resolved content via a guillotine query
const resolveContent = (
    baseContent: Content,
    branch: RepoBranch,
    locale: string,
    retries = 2
): Content | null =>
    runInLocaleContext(
        {
            locale: baseContent.language,
            attributes: {
                baseContentId: baseContent._id,
            },
        },
        () => {
            const contentId = baseContent._id;
            const queryResult = runSitecontentGuillotineQuery(baseContent, branch);

            // Peace-of-mind consistency check to ensure our version-history hack isn't affecting normal requests
            if (!validateTimestampConsistency(contentId, queryResult, branch)) {
                if (retries > 0) {
                    logger.error(
                        `Timestamp consistency check failed - Retrying ${retries} more times`
                    );
                } else {
                    logger.critical(`Time travel permanently disabled on this node`);
                    unhookTimeTravel();
                }

                return resolveContent(baseContent, branch, locale, retries - 1);
            }

            return queryResult
                ? {
                      ...queryResult,
                      // modifiedTime should also take any fragments on the page into account
                      modifiedTime: getModifiedTimeIncludingFragments(baseContent, branch),
                      languages: getLanguageVersions({
                          baseContent,
                          branch,
                          baseContentLocale: locale,
                      }),
                  }
                : null;
        }
    );

const resolveContentStudioRequest = (
    idOrPathRequested: string,
    branch: RepoBranch,
    locale?: string
) => {
    if (!locale) {
        logger.error(`No locale was specified for requested content ref "${idOrPathRequested}"`);
    }

    const localeActual = isValidLocale(locale) ? locale : getLayersData().defaultLocale;

    return runInLocaleContext({ locale: localeActual, branch }, () => {
        const content = contentLib.get({ key: idOrPathRequested });
        if (!content) {
            return null;
        }

        // If the content type does not support a full frontend preview in the editor, just return
        // the raw content, which is used to show certain info in place of the preview.
        return contentTypesForGuillotineQuery[content.type]
            ? resolveContent(content, branch, localeActual)
            : content;
    });
};

export const generateSitecontentResponse = ({
    idOrPathRequested,
    branch,
    localeRequested,
    isPreview,
}: {
    idOrPathRequested: string;
    branch: RepoBranch;
    localeRequested?: string;
    isPreview: boolean;
}) => {
    // Requests for a UUID should be explicitly resolved to the requested content id and requires
    // fewer steps to resolve. The same goes for requests to the draft branch.
    // These requests normally only comes from the Content Studio editor, with a specified locale
    if (isUUID(idOrPathRequested) || branch === 'draft') {
        return resolveContentStudioRequest(idOrPathRequested, branch, localeRequested);
    }

    const target = resolvePathToTarget({
        path: idOrPathRequested,
        branch,
    });

    // If the content was not found, check if there are any applicable redirects
    // for the requested path
    if (!target) {
        return getRedirectContent({ pathRequested: idOrPathRequested, branch });
    }

    const { content, locale } = target;

    const specialPreviewResponse = getSpecialPreviewResponseIfApplicable(
        content,
        idOrPathRequested,
        isPreview
    );

    if (specialPreviewResponse) {
        return specialPreviewResponse.response;
    }

    const customPathRedirect = getCustomPathRedirectIfApplicable({
        content,
        locale,
        branch,
        requestedPath: idOrPathRequested,
    });

    if (customPathRedirect) {
        return customPathRedirect;
    }

    return resolveContent(content, branch, locale);
};
