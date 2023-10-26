import * as contentLib from '/lib/xp/content';
import { logger } from '../../lib/utils/logging';
import { getLayersData, isValidLocale } from '../../lib/localization/layers-data';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { getContentLocaleRedirectTarget } from '../../lib/utils/content-utils';
import { contentTypesRenderedByEditorFrontend } from '../../lib/contenttype-lists';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { sitecontentResolveContent } from './resolve-content';
import { findTargetContent } from './find-target-content';

const contentTypesForGuillotineQuery: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesRenderedByEditorFrontend
);

const findTargetContentFromId = (contentId: string, locale?: string) => {
    if (!locale) {
        logger.error(`No locale was specified for content id request: "${contentId}"`);
    }

    const localeActual = isValidLocale(locale) ? locale : getLayersData().defaultLocale;

    const content = runInLocaleContext({ locale: localeActual }, () =>
        contentLib.get({ key: contentId })
    );

    if (content) {
        return {
            content,
            locale: localeActual,
        };
    }

    return findTargetContent({ path: contentId, branch: 'draft' });
};

export const sitecontentDraftResponse = ({
    idOrPath,
    requestedLocale,
}: {
    idOrPath: string;
    requestedLocale?: string;
}) => {
    const target = findTargetContentFromId(idOrPath, requestedLocale);
    if (!target) {
        return null;
    }

    const { content, locale } = target;

    // If the content type does not support a full frontend preview in the editor, just return
    // the raw content, which is used to show certain info in place of the preview.
    const contentResolved = contentTypesForGuillotineQuery.has(content.type)
        ? sitecontentResolveContent({ baseContent: content, branch: 'draft', locale })
        : { ...content, contentLayer: locale };

    const localeRedirectTarget = getContentLocaleRedirectTarget(content);
    if (contentResolved && localeRedirectTarget) {
        return {
            ...contentResolved,
            redirectToLayer: localeRedirectTarget,
        };
    }

    return contentResolved;
};
