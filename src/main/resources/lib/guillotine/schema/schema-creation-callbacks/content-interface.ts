import { CreationCallback } from '../../utils/creation-callback-utils';
import { getLayersData } from '../../../localization/layers-data';
import { buildLocalePath, isContentLocalized } from '../../../localization/locale-utils';
import { getLocaleFromContext } from '../../../localization/locale-context';

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

        const locale = getLocaleFromContext();

        return buildLocalePath(basePath, locale);
    };
};
