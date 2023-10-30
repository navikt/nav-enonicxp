import cacheLib from '/lib/cache';
import { findTargetContentAndLocale } from '../common/find-target-content-and-locale';
import { sitecontentSpecialResponse } from './special-redirects';
import { sitecontentContentResponse, SitecontentResponse } from '../common/content-response';
import { sitecontentNotFoundRedirect } from './not-found-redirects';

const ONE_DAY = 60 * 60 * 24;
const CACHE_NULL_VALUE_EXCEPTION_MESSAGE = 'CacheLoader returned null for key';

const cache = cacheLib.newCache({ size: 10000, expire: ONE_DAY });

const _sitecontentPublicResponse = ({
    idOrPath,
    isPreview,
}: {
    idOrPath: string;
    isPreview: boolean;
}): SitecontentResponse => {
    const target = findTargetContentAndLocale({
        path: idOrPath,
        branch: 'master',
    });

    // If the content was not found, return any applicable redirect fallback for the requested path
    if (!target) {
        return sitecontentNotFoundRedirect({ pathRequested: idOrPath, branch: 'master' });
    }

    const { content, locale } = target;

    // Check if any special conditions apply which should trigger a non-standard response
    const specialResponse = sitecontentSpecialResponse({
        content,
        locale,
        branch: 'master',
        requestedPath: idOrPath,
        isPreview,
    });

    if (specialResponse) {
        return specialResponse.response;
    }

    return sitecontentContentResponse({ baseContent: content, branch: 'master', locale });
};

export const sitecontentPublicResponse = ({
    idOrPath,
    isPreview,
    cacheKey,
}: {
    idOrPath: string;
    isPreview: boolean;
    cacheKey?: string;
}): SitecontentResponse => {
    if (!cacheKey) {
        return _sitecontentPublicResponse({ idOrPath, isPreview });
    }

    try {
        return cache.get(cacheKey, () => _sitecontentPublicResponse({ idOrPath, isPreview }));
    } catch (e: any) {
        // cache.get throws if callback returns null
        if (e?.message?.startsWith(CACHE_NULL_VALUE_EXCEPTION_MESSAGE)) {
            return null;
        }

        // For any other error, throw to the next handler
        throw e;
    }
};
