import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import cacheLib from '/lib/cache';
import { logger } from '../../../lib/utils/logging';
import { getLayersData, isValidLocale } from '../../../lib/localization/layers-data';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { getContentLocaleRedirectTarget, isMedia } from '../../../lib/utils/content-utils';
import { contentTypesRenderedByEditorFrontend } from '../../../lib/contenttype-lists';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { sitecontentContentResponse, SitecontentResponse } from '../common/content-response';
import { findTargetContentAndLocale as findTargetContentPublic } from '../common/find-target-content-and-locale';
import { sitecontentNotFoundRedirect } from '../public/not-found-redirects';
import { isUUID } from '../../../lib/utils/uuid';
import { getRepoConnection } from '../../../lib/utils/repo-utils';

const ONE_HOUR = 60 * 60;
const guillotineCache = cacheLib.newCache({ size: 2000, expire: ONE_HOUR });

const resolveWithGuillotine = (content: Content, locale: string) => {
    // The cache should only be valid for the current content version
    const cacheKey = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'draft',
        asAdmin: true,
    }).get<Content>(content._id)!._versionKey;

    try {
        return guillotineCache.get(cacheKey, () =>
            sitecontentContentResponse({ baseContent: content, branch: 'draft', locale })
        );
    } catch (e) {
        logger.warning(`Error while resolving draft content for ${content._id} / ${locale} - ${e}`);
        return null;
    }
};

const contentTypesForGuillotineQuery: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesRenderedByEditorFrontend
);

const isGuillotineResolvable = (content: Content) =>
    contentTypesForGuillotineQuery.has(content.type) || isMedia(content);

const findTargetContent = (idOrPath: string, locale?: string) => {
    if (!locale) {
        logger.error(`No locale was specified for draft request: "${idOrPath}"`);
    }

    const localeActual = isValidLocale(locale) ? locale : getLayersData().defaultLocale;

    const content = runInLocaleContext({ locale: localeActual, branch: 'draft' }, () =>
        contentLib.get({ key: idOrPath })
    );

    if (content) {
        return {
            content,
            locale: localeActual,
        };
    }

    // Try to resolve the requested path via the public path resolver, which takes custom paths
    // and implicit locale paths into account. This ensures the site in the editor preview can be
    // navigated, even with our public URL structure
    return isUUID(idOrPath) ? null : findTargetContentPublic({ path: idOrPath, branch: 'draft' });
};

export const sitecontentDraftResponse = ({
    idOrPath,
    requestedLocale,
}: {
    idOrPath: string;
    requestedLocale?: string;
}): SitecontentResponse => {
    const target = findTargetContent(idOrPath, requestedLocale);
    if (!target) {
        // UUID-requests should only return an exact target
        return isUUID(idOrPath)
            ? null
            : sitecontentNotFoundRedirect({ pathRequested: idOrPath, branch: 'draft' });
    }

    const { content, locale } = target;

    // If the content type can not be resolved through Guillotine, just return the raw content,
    // which is used to show certain info in place of the normal preview
    const contentResolved = isGuillotineResolvable(content)
        ? resolveWithGuillotine(content, locale)
        : { ...content, contentLayer: locale };

    const localeRedirectTarget = getContentLocaleRedirectTarget(content);
    if (contentResolved && localeRedirectTarget) {
        (contentResolved as any).redirectToLayer = localeRedirectTarget;
    }

    return contentResolved;
};
