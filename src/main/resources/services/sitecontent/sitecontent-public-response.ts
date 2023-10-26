import { findTargetContent } from './find-target-content';
import { getRedirectResponseIfApplicable, getRedirectFallback } from './resolve-redirects';
import { sitecontentResolveContent } from './resolve-content';

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

    const redirectResponse = getRedirectResponseIfApplicable({
        content,
        locale,
        branch: 'master',
        requestedPath: idOrPath,
        isPreview,
    });

    if (redirectResponse) {
        return redirectResponse;
    }

    return sitecontentResolveContent({ baseContent: content, branch: 'master', locale });
};
