import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { buildLocalePath, getLocalizedContentVersions } from './locale-utils';
import { RepoBranch } from '../../types/common';
import { forceArray, stripPathPrefix } from '../utils/nav-utils';
import { runInContext } from '../context/run-in-context';
import { LanguagesLegacy } from '../../site/mixins/languages-legacy/languages-legacy';
import { hasValidCustomPath } from '../custom-paths/custom-paths';

type ContentWithLegacyLanguages = Content & {
    data: Required<LanguagesLegacy>;
};

type LanguageSelectorData = {
    language: string;
    _path: string;
};

const transformContent = (content: Content, layerLocale?: string): LanguageSelectorData => {
    const basePath = hasValidCustomPath(content)
        ? content.data.customPath
        : stripPathPrefix(content._path);

    return {
        language: content.language,
        _path: layerLocale ? buildLocalePath(basePath, layerLocale) : basePath,
    };
};

const contentHasLegacyLanguages = (content: unknown): content is ContentWithLegacyLanguages => {
    return !!(content as ContentWithLegacyLanguages).data?.languages;
};

const getLayersLanguages = (content: Content, branch: RepoBranch) => {
    const { _id, language: parentLanguage } = content;

    const localizedContent = getLocalizedContentVersions(_id, branch);

    return localizedContent.reduce((acc, localizedContent) => {
        const { language } = localizedContent;
        if (language === parentLanguage) {
            return acc;
        }

        return [...acc, transformContent(localizedContent, language)];
    }, [] as LanguageSelectorData[]);
};

const getLegacyLanguages = (content: Content) => {
    if (!contentHasLegacyLanguages(content)) {
        return [];
    }

    const { _id: parentContentId } = content;

    return forceArray(content.data.languages).reduce((acc, contentId) => {
        if (contentId === parentContentId) {
            return acc;
        }

        const languageContent = contentLib.get({ key: contentId });
        if (!languageContent) {
            return acc;
        }

        return [...acc, transformContent(languageContent)];
    }, [] as LanguageSelectorData[]);
};

// Language versions retrieved from layers should take precedence over legacy if there is a
// duplicate language version
const mergeLayersWithLegacy = (
    fromLayers: LanguageSelectorData[],
    fromLegacy: LanguageSelectorData[]
) => {
    return fromLegacy.reduce((acc, legacyData) => {
        if (acc.some((languageData) => languageData.language === legacyData.language)) {
            return acc;
        }

        return [...acc, legacyData];
    }, fromLayers);
};

export const getLanguageVersions = (content: Content, branch: RepoBranch) => {
    const contentFromLayers = getLayersLanguages(content, branch);
    const contentFromLegacyLanguages = runInContext({ branch }, () => getLegacyLanguages(content));

    return mergeLayersWithLegacy(contentFromLayers, contentFromLegacyLanguages);
};