import * as contextLib from '/lib/xp/context';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { forceArray } from '../../../utils/nav-utils';
import { getLayersData } from '../../../localization/layers-data';

export const contentInterfaceCallback: CreationCallback = (context, params) => {
    params.fields._path.resolve = (env) => {
        const { _path, data, inherit, language } = env.source;

        const baseLocalePath = data?.customPath || _path;

        const { defaultLocale } = getLayersData();
        if (language === defaultLocale) {
            return baseLocalePath;
        }

        const isLocalized = !forceArray(inherit).includes('CONTENT');
        if (!isLocalized) {
            return baseLocalePath;
        }

        const locale = contextLib.get()?.attributes?.locale;

        return locale ? `${baseLocalePath}/${locale}` : baseLocalePath;
    };
};
