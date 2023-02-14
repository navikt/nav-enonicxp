import * as nodeLib from '/lib/xp/node';
import { Locale, RepoBranch } from '../../types/common';
import { getLayersData } from './layers-data';

export const getLayersMultiConnection = (branch: RepoBranch) => {
    return nodeLib.multiRepoConnect({
        sources: getLayersData().sources[branch],
    });
};

export const buildLocalePath = (basePath: string, locale: Locale) => {
    const { defaultLocale } = getLayersData();

    const localeSuffix = `/${locale}`;

    if (locale === defaultLocale || basePath.endsWith(localeSuffix)) {
        return basePath;
    }

    // Removes trailing slash from base path
    return basePath.replace(/(\/)?$/, localeSuffix);
};
