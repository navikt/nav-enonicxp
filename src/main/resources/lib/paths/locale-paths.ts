import { getLayersData, isValidLocale } from '../localization/layers-data';
import { logger } from '../utils/logging';

type PathAndLocale = {
    basePath: string;
    locale: string;
};

export const resolveLocalePathToBasePath = (localePath: string): PathAndLocale | null => {
    const { defaultLocale } = getLayersData();

    const pathSegments = localePath.split('/');
    const possibleLocale = pathSegments.pop();

    logger.info(
        `Locale path: ${localePath} - Possible locale ${possibleLocale} - Is valid ${isValidLocale(possibleLocale)}`
    );

    // The default locale should not be an allowed suffix. For this locale we only want to resolve
    // requests for the actual path, with no locale-suffix.
    if (possibleLocale === defaultLocale || !isValidLocale(possibleLocale)) {
        return null;
    }

    return {
        locale: possibleLocale,
        basePath: pathSegments.join('/'),
    };
};

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
