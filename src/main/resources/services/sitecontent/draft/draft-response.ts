import * as contentLib from '/lib/xp/content';
import { logger } from '../../../lib/utils/logging';
import { getLayersData, isValidLocale } from '../../../lib/localization/layers-data';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { getContentLocaleRedirectTarget } from '../../../lib/utils/content-utils';
import { contentTypesRenderedByEditorFrontend } from '../../../lib/contenttype-lists';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { sitecontentContentResponse } from '../common/content-response';
import { findTargetContent } from '../common/find-target-content';

const contentTypesForGuillotineQuery: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesRenderedByEditorFrontend
);

const _findTargetContent = (idOrPath: string, locale?: string) => {
    if (!locale) {
        logger.error(`No locale was specified for draft request: "${idOrPath}"`);
    }

    const localeActual = isValidLocale(locale) ? locale : getLayersData().defaultLocale;

    const content = runInLocaleContext({ locale: localeActual }, () =>
        contentLib.get({ key: idOrPath })
    );

    if (content) {
        return {
            content,
            locale: localeActual,
        };
    }

    // Try to resolve the requested id/path via the "public" resolver, which takes custom paths
    // and implicit locale paths into account. This ensures the site in the editor preview can be
    // navigated, even with our public URL structure
    return findTargetContent({ path: idOrPath, branch: 'draft' });
};

export const sitecontentDraftResponse = ({
    idOrPath,
    requestedLocale,
}: {
    idOrPath: string;
    requestedLocale?: string;
}) => {
    const target = _findTargetContent(idOrPath, requestedLocale);
    if (!target) {
        return null;
    }

    const { content, locale } = target;

    // If the content type does not support a full frontend preview in the editor, just return
    // the raw content, which is used to show certain info in place of the preview.
    const contentResolved = contentTypesForGuillotineQuery.has(content.type)
        ? sitecontentContentResponse({ baseContent: content, branch: 'draft', locale })
        : { ...content, contentLayer: locale };

    const localeRedirectTarget = getContentLocaleRedirectTarget(content);
    if (contentResolved && localeRedirectTarget) {
        (contentResolved as any).redirectToLayer = localeRedirectTarget;
    }

    return contentResolved;
};
