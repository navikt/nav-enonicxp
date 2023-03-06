import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getContentFromAllLayers } from './locale-utils';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { LanguagesLegacy } from '../../site/mixins/languages-legacy/languages-legacy';
import { getPublicPath } from '../paths/public-path';
import { CONTENT_LOCALE_DEFAULT } from '../constants';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';

type ContentWithLegacyLanguages = Content & {
    data: Required<LanguagesLegacy>;
};

type LanguageSelectorData = {
    language: string;
    _path: string;
};

type GetLanguageVersionsParams = {
    baseContent: Content;
    branch: RepoBranch;
    baseContentLocale: string;
};

const transformContent = (content: Content, layerLocale: string): LanguageSelectorData => {
    return {
        language: content.language,
        _path: getPublicPath(content, layerLocale),
    };
};

const contentHasLegacyLanguages = (content: unknown): content is ContentWithLegacyLanguages => {
    return !!(content as ContentWithLegacyLanguages).data?.languages;
};

const getLayersLanguages = (
    baseContent: Content,
    branch: RepoBranch,
    baseContentLocale: string
) => {
    const localizedContent = getContentFromAllLayers({
        contentId: baseContent._id,
        branch,
        state: 'localized',
    });

    return localizedContent.reduce<Content[]>((acc, localizedContent) => {
        const { content, locale } = localizedContent;
        if (locale === baseContentLocale || content.language === baseContent.language) {
            return acc;
        }

        return [...acc, content];
    }, []);
};

const getLegacyLanguages = (baseContent: Content) => {
    if (!contentHasLegacyLanguages(baseContent)) {
        return [];
    }

    const { _id: parentContentId } = baseContent;

    return forceArray(baseContent.data.languages).reduce<Content[]>((acc, contentId) => {
        if (contentId === parentContentId) {
            return acc;
        }

        const languageContent = contentLib.get({ key: contentId });
        if (!languageContent) {
            logger.error(
                `Content ${baseContent._path} has an invalid language version set: ${contentId}`
            );
            return acc;
        }

        if (languageContent.language === baseContent.language) {
            logger.error(
                `Content ${baseContent._path} has a language version set to the same language as itself: ${languageContent._path}`
            );
            return acc;
        }

        return [...acc, languageContent];
    }, []);
};

// Language versions retrieved from layers should take precedence over the legacy data.languages field
const mergeLayersWithLegacy = <Type extends LanguageSelectorData>(
    fromLayers: Type[],
    fromLegacy: Type[]
) => {
    return fromLegacy.reduce((acc, legacyData) => {
        if (acc.some((languageData) => languageData.language === legacyData.language)) {
            return acc;
        }

        return [...acc, legacyData];
    }, fromLayers);
};

const getLanguageVersions = ({
    baseContent,
    branch,
    baseContentLocale,
}: GetLanguageVersionsParams) => {
    return {
        contentFromLayers: getLayersLanguages(baseContent, branch, baseContentLocale),
        contentFromLegacyLanguages: runInContext({ branch }, () => getLegacyLanguages(baseContent)),
    };
};

export const getLanguageVersionsForSelector = (params: GetLanguageVersionsParams) => {
    const { contentFromLayers, contentFromLegacyLanguages } = getLanguageVersions(params);

    return mergeLayersWithLegacy(
        contentFromLayers.map((content) => transformContent(content, content.language)),
        contentFromLegacyLanguages.map((content) =>
            transformContent(content, CONTENT_LOCALE_DEFAULT)
        )
    );
};

export const getLanguageVersionsFull = (params: GetLanguageVersionsParams) => {
    const { contentFromLayers, contentFromLegacyLanguages } = getLanguageVersions(params);

    return mergeLayersWithLegacy(contentFromLayers, contentFromLegacyLanguages);
};
