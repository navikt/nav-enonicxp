import { Content } from '/lib/xp/content';
import { getLayersData } from './layers-data';
import { forceArray } from '../utils/array-utils';

export const buildLocalePath = (basePath: string, locale: string) => {
    const { defaultLocale, localeToRepoIdMap } = getLayersData();

    if (locale === defaultLocale || !localeToRepoIdMap[locale]) {
        return basePath;
    }

    const localeSuffix = `/${locale}`;

    if (basePath.endsWith(localeSuffix)) {
        return basePath;
    }

    // Removes trailing slash from base path
    return basePath.replace(/(\/)?$/, localeSuffix);
};

export const isContentLocalized = (content: Content) =>
    !forceArray(content.inherit).includes('CONTENT');
