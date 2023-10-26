import * as contentLib from '/lib/xp/content';
import { logger } from '../../lib/utils/logging';
import { getLayersData, isValidLocale } from '../../lib/localization/layers-data';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { getContentFromCustomPath } from '../../lib/paths/custom-paths/custom-path-utils';
import { getContentLocaleRedirectTarget } from '../../lib/utils/content-utils';
import { contentTypesRenderedByEditorFrontend } from '../../lib/contenttype-lists';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { RepoBranch } from '../../types/common';
import { sitecontentResolveContent } from './resolve-content';

const contentTypesForGuillotineQuery: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesRenderedByEditorFrontend
);

// Requests for a UUID should be explicitly resolved to the requested content id and requires
// fewer steps to resolve. The same goes for requests to the draft branch.
// These requests normally only comes from the Content Studio editor, with a specified locale
export const sitecontentDraftResponse = ({
    idOrPath,
    locale,
}: {
    idOrPath: string;
    locale?: string;
}) => {
    if (!locale) {
        logger.error(`No locale was specified for requested content ref "${idOrPath}"`);
    }

    const localeActual = isValidLocale(locale) ? locale : getLayersData().defaultLocale;

    return runInLocaleContext({ locale: localeActual, branch: 'draft' }, () => {
        const content =
            contentLib.get({ key: idOrPath }) ||
            getContentFromCustomPath(idOrPath).find(
                // Allow requests to a customPath from CS, as long as it is unique
                (contentWithCustomPath, _, array) => array.length === 1
            );
        if (!content) {
            return null;
        }

        // If the content type does not support a full frontend preview in the editor, just return
        // the raw content, which is used to show certain info in place of the preview.
        const contentResolved = contentTypesForGuillotineQuery.has(content.type)
            ? sitecontentResolveContent(content, 'draft', localeActual)
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
