import * as contextLib from '/lib/xp/context';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getLayersData, isValidLocale } from '../../../localization/layers-data';
import { logger } from '../../../utils/logging';
import { buildLocalePath, isContentLocalized } from '../../../localization/locale-utils';

export const contentInterfaceCallback: CreationCallback = (context, params) => {
    params.fields._path.resolve = (env) => {
        const { _path, data, language } = env.source;

        const basePath = data?.customPath || _path;

        const { defaultLocale } = getLayersData();

        // For the default locale, we always use the base path
        if (language === defaultLocale) {
            return basePath;
        }

        // If the content is not localized, we always use the base path
        // (will resolve to the default layer version)
        if (!isContentLocalized(env.source)) {
            return basePath;
        }

        const locale = contextLib.get()?.attributes?.locale as string | undefined;

        if (!isValidLocale(locale)) {
            logger.info(`Locale was not set in context for request to ${_path}`);
            return basePath;
        }

        return buildLocalePath(basePath, locale);
    };
};
