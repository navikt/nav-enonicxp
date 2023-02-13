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
import { runInLocaleContext } from '../../lib/localization/context';
import { resolvePathToTarget } from '../../lib/localization/layers-query';
import { getCustomPathRedirectIfApplicable, getRedirectContent } from './redirects';

// The previewOnly x-data flag is used on content which should only be publicly accessible
// through the /utkast route in the frontend. Calls from this route comes with the "preview"
// query param
const shouldBlockPreview = (content: Content, branch: RepoBranch, isPreview: boolean) => {
    const previewOnlyFlag = content.x?.[componentAppKey]?.previewOnly?.previewOnly;
    return branch === 'master' && previewOnlyFlag && !isPreview;
};

const getContent = (
    baseContent: Content,
    contentRef: string,
    branch: RepoBranch,
    retries = 2
): Content | null => {
    // const contentRef = getInternalContentPathFromCustomPath(requestedPathOrId) || requestedPathOrId;

    const content = runSitecontentGuillotineQuery(baseContent, branch);

    // Consistency check to ensure our version-history hack isn't affecting normal requests
    if (!validateTimestampConsistency(contentRef, content, branch)) {
        if (retries > 0) {
            logger.error(`Timestamp consistency check failed - Retrying ${retries} more times`);
        } else {
            logger.critical(`Time travel permanently disabled on this node`);
            unhookTimeTravel();
        }

        return getContent(baseContent, contentRef, branch, retries - 1);
    }

    return content
        ? {
              ...content,
              // modifiedTime should also take any fragments on the page into account
              modifiedTime: getModifiedTimeIncludingFragments(contentRef, branch),
          }
        : null;
};

const resolveIdRequest = (contentId: string, branch: RepoBranch, locale?: string) => {
    const localeActual = isValidLocale(locale) ? locale : getLayersData().defaultLocale;

    const content = contentLib.get({ key: contentId });
    if (!content) {
        return null;
    }

    return runInLocaleContext({ locale: localeActual }, () =>
        getContent(content, contentId, branch)
    );
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
    if (isUUID(idOrPathRequested)) {
        return resolveIdRequest(idOrPathRequested, branch, localeRequested);
    }

    const target = resolvePathToTarget({
        path: idOrPathRequested,
        branch,
    });

    // If the content was not found, check if there are any applicable redirects
    // for the requested path/id
    if (!target) {
        return getRedirectContent(idOrPathRequested, branch);
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

    return runInLocaleContext({ locale }, () => getContent(content, content._id, branch)) || null;
};
