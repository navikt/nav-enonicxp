import { ContentNode } from '../../../../types/content-types/content-config';
import { getLanguageVersions } from '../../../localization/resolve-language-versions';
import { getLayersData } from '../../../localization/layers-data';

export const getSearchDocumentLanguage = (language: string) =>
    language === 'no' ? 'nb' : language;

export const getSearchDocumentLanguageRefs = (content: ContentNode) => {
    const languageVersions = getLanguageVersions({
        baseContent: content,
        baseContentLocale: content.language || getLayersData().defaultLocale,
        branch: 'main',
    });

    return languageVersions.map((version) => getSearchDocumentLanguage(version.language));
};
