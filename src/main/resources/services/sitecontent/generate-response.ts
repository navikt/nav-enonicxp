import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { componentAppKey } from '../../lib/constants';
import { getModifiedTimeIncludingFragments } from '../../lib/utils/fragment-utils';
import { isUUID } from '../../lib/utils/uuid';
import { validateTimestampConsistency } from '../../lib/time-travel/consistency-check';
import { unhookTimeTravel } from '../../lib/time-travel/time-travel-hooks';
import { logger } from '../../lib/utils/logging';
import { getLayersData, isValidLocale } from '../../lib/localization/layers-data';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { resolvePathToTarget } from '../../lib/localization/locale-paths';
import { getCustomPathRedirectIfApplicable, getRedirectContent } from './resolve-redirects';
import { getLanguageVersions } from '../../lib/localization/resolve-language-versions';

// The previewOnly x-data flag is used on content which should only be publicly accessible
// through the /utkast route in the frontend. Calls from this route comes with the "preview"
// query param
const shouldBlockPreview = (content: Content, branch: RepoBranch, isPreview: boolean) => {
    if (branch !== 'master' || isPreview) {
        return false;
    }

    return !!content.x?.[componentAppKey]?.previewOnly?.previewOnly;
};

// Resolve the base content to a fully resolved content via a guillotine query
const resolveContent = (baseContent: Content, branch: RepoBranch, retries = 2): Content | null => {
    const contentId = baseContent._id;
    const queryResult = runSitecontentGuillotineQuery(baseContent, branch);

    // Peace-of-mind consistency check to ensure our version-history hack isn't affecting normal requests
    if (!validateTimestampConsistency(contentId, queryResult, branch)) {
        if (retries > 0) {
            logger.error(`Timestamp consistency check failed - Retrying ${retries} more times`);
        } else {
            logger.critical(`Time travel permanently disabled on this node`);
            unhookTimeTravel();
        }

        return resolveContent(baseContent, branch, retries - 1);
    }

    return queryResult
        ? {
              ...queryResult,
              // modifiedTime should also take any fragments on the page into account
              modifiedTime: getModifiedTimeIncludingFragments(baseContent, branch),
              languages: getLanguageVersions(baseContent, branch),
          }
        : null;
};

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

        return resolveContent(content, branch);
    });
};

export const generateSitecontentResponse = ({
    idOrPathRequested,
    branch,
    localeRequested,
    preview,
}: {
    idOrPathRequested: string;
    branch: RepoBranch;
    localeRequested?: string;
    preview: boolean;
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

    if (shouldBlockPreview(content, branch, preview)) {
        return null;
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

    return runInLocaleContext({ locale }, () => resolveContent(content, branch));
};
