import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getContentFromAllLayers } from './locale-utils';
import { RepoBranch } from '../../types/common';
import { forceArray } from '../utils/nav-utils';
import { runInContext } from '../context/run-in-context';
import { LanguagesLegacy } from '../../site/mixins/languages-legacy/languages-legacy';
import { getPublicPath } from '../paths/public-path';
import { CONTENT_LOCALE_DEFAULT } from '../constants';

type ContentWithLegacyLanguages = Content & {
    data: Required<LanguagesLegacy>;
};

type LanguageSelectorData = {
    language: string;
    _path: string;
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

const getLayersLanguages = (content: Content, branch: RepoBranch) => {
    const { _id, language: parentLanguage } = content;

    const localizedContent = getContentFromAllLayers({
        contentId: _id,
        branch,
        state: 'localized',
    });

    return localizedContent.reduce<Content[]>((acc, localizedContent) => {
        const { content, locale } = localizedContent;
        if (locale === parentLanguage) {
            return acc;
        }

        return [...acc, content];
    }, []);
};

const getLegacyLanguages = (content: Content) => {
    if (!contentHasLegacyLanguages(content)) {
        return [];
    }

    const { _id: parentContentId } = content;

    return forceArray(content.data.languages).reduce<Content[]>((acc, contentId) => {
        if (contentId === parentContentId) {
            return acc;
        }

        const languageContent = contentLib.get({ key: contentId });
        if (!languageContent) {
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

const getLanguageVersions = (content: Content, branch: RepoBranch) => {
    return {
        contentFromLayers: getLayersLanguages(content, branch),
        contentFromLegacyLanguages: runInContext({ branch }, () => getLegacyLanguages(content)),
    };
};

export const getLanguageVersionsForSelector = (content: Content, branch: RepoBranch) => {
    const { contentFromLayers, contentFromLegacyLanguages } = getLanguageVersions(content, branch);

    return mergeLayersWithLegacy(
        contentFromLayers.map((content) => transformContent(content, content.language)),
        contentFromLegacyLanguages.map((content) =>
            transformContent(content, CONTENT_LOCALE_DEFAULT)
        )
    );
};

export const getLanguageVersionsFull = (content: Content, branch: RepoBranch) => {
    const { contentFromLayers, contentFromLegacyLanguages } = getLanguageVersions(content, branch);

    return mergeLayersWithLegacy(contentFromLayers, contentFromLegacyLanguages);
};
