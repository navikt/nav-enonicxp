import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { getModifiedTimeIncludingFragments } from '../../lib/utils/fragment-utils';
import { isUUID } from '../../lib/utils/uuid';
import { logger } from '../../lib/utils/logging';
import { getLayersData, isValidLocale } from '../../lib/localization/layers-data';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { resolvePathToTarget } from '../../lib/localization/locale-paths';
import {
    transformToRedirectResponse,
    getSpecialRedirectIfApplicable,
    getRedirectFallback,
} from './resolve-redirects';
import { getLanguageVersions } from '../../lib/localization/resolve-language-versions';
import { contentTypesRenderedByEditorFrontend } from '../../lib/contenttype-lists';
import { stringArrayToSet } from '../../lib/utils/array-utils';
import { resolveLegacyContentRedirects } from './resolve-legacy-content-redirects';
import { getContentFromCustomPath } from '../../lib/paths/custom-paths/custom-path-utils';
import {
    getContentLocaleRedirectTarget,
    isContentPreviewOnly,
} from '../../lib/utils/content-utils';

const contentTypesForGuillotineQuery = stringArrayToSet(contentTypesRenderedByEditorFrontend);

// The previewOnly x-data flag is used on content which should only be publicly accessible
// through the /utkast route in the frontend. Calls from this route comes with the "preview"
// query param. We also want this behaviour for pages with an external redirect url set.
const getSpecialPreviewResponseIfApplicable = (
    content: Content<any>,
    requestedPath: string,
    isPreview: boolean
) => {
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

// Resolve the base content to a fully resolved content via a guillotine query
const resolveContent = (baseContent: Content, branch: RepoBranch, locale: string): Content | null =>
    runInLocaleContext(
        {
            locale: baseContent.language,
            attributes: {
                baseContentId: baseContent._id,
            },
        },
        () => {
            const queryResult = runSitecontentGuillotineQuery(baseContent, branch);

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
                      contentLayer: locale,
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
        const content =
            contentLib.get({ key: idOrPathRequested }) ||
            getContentFromCustomPath(idOrPathRequested).find(
                // Allow requests to a customPath from CS, as long as it is unique
                (contentWithCustomPath, _, array) => array.length === 1
            );
        if (!content) {
            return null;
        }

        // If the content type does not support a full frontend preview in the editor, just return
        // the raw content, which is used to show certain info in place of the preview.
        const contentResolved = contentTypesForGuillotineQuery[content.type]
            ? resolveContent(content, branch, localeActual)
            : { ...content, contentLayer: localeActual };

        const localeTarget = getContentLocaleRedirectTarget(content);
        if (contentResolved && localeTarget) {
            return {
                ...contentResolved,
                redirectToLayer: localeTarget,
            };
        }

        return contentResolved;
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
        return getRedirectFallback({ pathRequested: idOrPathRequested, branch });
    }

    const { content, locale } = target;

    const redirectLegacyContent = resolveLegacyContentRedirects(content);

    if (redirectLegacyContent) {
        return redirectLegacyContent;
    }

    const specialPreviewResponse = getSpecialPreviewResponseIfApplicable(
        content,
        idOrPathRequested,
        isPreview
    );

    if (specialPreviewResponse) {
        return specialPreviewResponse.response;
    }

    const redirectResponse = getSpecialRedirectIfApplicable({
        content,
        locale,
        branch,
        requestedPath: idOrPathRequested,
    });

    if (redirectResponse) {
        return redirectResponse;
    }

    return resolveContent(content, branch, locale);
};
