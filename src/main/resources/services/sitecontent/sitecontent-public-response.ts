import { Content } from '/lib/xp/content';
import { findTargetContent } from './find-target-content';
import {
    transformToRedirectResponse,
    getSpecialRedirectIfApplicable,
    getRedirectFallback,
} from './resolve-redirects';
import { resolveLegacyContentRedirects } from './resolve-legacy-content-redirects';
import { isContentPreviewOnly } from '../../lib/utils/content-utils';
import { sitecontentResolveContent } from './resolve-content';

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

export const sitecontentPublicResponse = ({
    idOrPath,
    isPreview,
}: {
    idOrPath: string;
    isPreview: boolean;
}) => {
    const target = findTargetContent({
        path: idOrPath,
        branch: 'master',
    });

    // If the content was not found, check if there are any applicable redirects
    // for the requested path
    if (!target) {
        return getRedirectFallback({ pathRequested: idOrPath, branch: 'master' });
    }

    const { content, locale } = target;

    const redirectLegacyContent = resolveLegacyContentRedirects(content);

    if (redirectLegacyContent) {
        return redirectLegacyContent;
    }

    const specialPreviewResponse = getSpecialPreviewResponseIfApplicable(
        content,
        idOrPath,
        isPreview
    );

    if (specialPreviewResponse) {
        return specialPreviewResponse.response;
    }

    const redirectResponse = getSpecialRedirectIfApplicable({
        content,
        locale,
        branch: 'master',
        requestedPath: idOrPath,
    });

    if (redirectResponse) {
        return redirectResponse;
    }

    return sitecontentResolveContent(content, 'master', locale);
};
