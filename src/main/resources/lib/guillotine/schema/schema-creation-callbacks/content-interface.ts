import * as contextLib from '/lib/xp/context';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';
import { getLayersData, isValidLocale } from '../../../localization/layers-data';
import { logger } from '../../../utils/logging';
import { buildLocalePath } from '../../../localization/locale-utils';

export const contentInterfaceCallback: CreationCallback = (context, params) => {
    params.fields._path.resolve = (env) => {
        const { _path, data, inherit, language } = env.source;

        const basePath = data?.customPath || _path;

        const { defaultLocale } = getLayersData();

        // For the default locale, we always use the base path
        if (language === defaultLocale) {
            return basePath;
        }

        const isLocalized = !forceArray(inherit).includes('CONTENT');

        // If the content is not localized, we always use the base path
        // (will resolve to the default layer version)
        if (!isLocalized) {
            return basePath;
        }

        const locale = contextLib.get()?.attributes?.locale as string | undefined;

        // If this happens there is a bug somewhere. A valid locale context should always be set at this point
        if (!isValidLocale(locale)) {
            logger.critical(`Locale was not set in context for request to ${_path}`);
            return basePath;
        }

        return buildLocalePath(basePath, locale);
    };
};
