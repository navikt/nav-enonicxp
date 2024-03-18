import { ContentNode } from '../../../../types/content-types/content-config';
import { getLanguageVersions } from '../../../localization/resolve-language-versions';

export const getSearchDocumentLanguage = (language: string) =>
    language === 'no' ? 'nb' : language;

export const getSearchDocumentLanguageRefs = (content: ContentNode) => {
    const languageVersions = getLanguageVersions({
        baseContent: content,
        baseContentLocale: content.language,
        branch: 'master',
    });

    return languageVersions.map((version) => getSearchDocumentLanguage(version.language));
};
