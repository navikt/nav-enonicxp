import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { LanguagesLegacy } from '../../site/mixins/languages-legacy/languages-legacy';
import { getPublicPath } from '../paths/public-path';
import { CONTENT_LOCALE_DEFAULT } from '../constants';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { getContentLocaleRedirectTarget, isContentPreviewOnly } from '../utils/content-utils';
import { getContentFromAllLayers } from './layers-repo-utils/get-content-from-all-layers';

type ContentWithLegacyLanguages = Content & {
    data: Required<LanguagesLegacy>;
};

export type LanguageSelectorData = {
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

        if (
            locale === baseContentLocale ||
            content.language === baseContent.language ||
            isContentPreviewOnly(content) ||
            !!getContentLocaleRedirectTarget(content)
        ) {
            return acc;
        }

        return [...acc, content];
    }, []);
};

const getLegacyLanguages = (baseContent: Content, branch: RepoBranch): Content[] => {
    if (!contentHasLegacyLanguages(baseContent)) {
        return [];
    }

    const { _id: baseContentId } = baseContent;

    return forceArray(baseContent.data.languages).reduce<Content[]>((acc, languageContentId) => {
        if (languageContentId === baseContentId) {
            return acc;
        }

        const languageContent = contentLib.get({ key: languageContentId });
        if (!languageContent) {
            logger.warning(
                `Content ${baseContent._path} has an invalid language version set: ${languageContentId}`
            );
            return acc;
        }

        if (languageContent.language === baseContent.language) {
            logger.warning(
                `Content ${baseContent._path} has a language version set to the same language as itself: ${languageContent._path}`
            );
            return acc;
        }

        if (languageContent.language === CONTENT_LOCALE_DEFAULT) {
            const fromLayers = getLayersLanguages(languageContent, branch, CONTENT_LOCALE_DEFAULT);
            acc.push(...fromLayers);
        }

        acc.push(languageContent);

        return acc;
    }, []);
};

// Language versions retrieved from layers should take precedence over the legacy data.languages field
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

export const getLanguageVersions = ({
    baseContent,
    branch,
    baseContentLocale,
}: GetLanguageVersionsParams) => {
    const contentFromLayers = getLayersLanguages(baseContent, branch, baseContentLocale);
    const contentFromLegacyLanguages = runInContext({ branch }, () =>
        getLegacyLanguages(baseContent, branch)
    );

    return mergeLayersWithLegacy(
        contentFromLayers.map((content) => transformContent(content, content.language)),
        contentFromLegacyLanguages.map((content) =>
            transformContent(content, CONTENT_LOCALE_DEFAULT)
        )
    );
};
