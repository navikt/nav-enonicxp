import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { forceArray } from '../../utils/array-utils';
import { getLocaleFromContext } from '../../localization/locale-context';
import { ContentDataLocaleFallback } from '@xp-types/site/content-types/content-data-locale-fallback';
import { splitByLocalizationState } from '../../localization/split-by-localization-state';

type FallbackContentData = Omit<
    NonNullable<ContentDataLocaleFallback['items']>[number],
    'enabled' | 'contentId' | 'contentQuery'
>;

type ContentWithFallbackData<ContentType extends Content> = ContentType & {
    data: Partial<FallbackContentData>;
};

type Args<ContentType extends Content> = {
    contents: ContentWithFallbackData<ContentType>[];
    language: string;
    localeFallbackIds: string[];
};

export const getLocalizedContentWithFallbackData = <ContentType extends Content>({
    contents,
    language,
    localeFallbackIds,
}: Args<ContentType>) => {
    const { localized, nonLocalized } = splitByLocalizationState(contents, language);

    if (localeFallbackIds.length === 0) {
        return localized;
    }

    const nonLocalizedContentWithFallbackData = injectLocaleFallbackData(
        nonLocalized,
        localeFallbackIds
    );

    return [...localized, ...nonLocalizedContentWithFallbackData];
};

const injectLocaleFallbackData = <ContentType extends Content>(
    contents: ContentWithFallbackData<ContentType>[],
    localeFallbackIds: string[]
): ContentWithFallbackData<ContentType>[] => {
    const fallbackContents = contentLib.query({
        count: localeFallbackIds.length,
        contentTypes: ['no.nav.navno:content-data-locale-fallback'],
        filters: {
            ids: { values: localeFallbackIds },
        },
    }).hits;

    if (fallbackContents.length === 0) {
        logger.warning(`No fallback data found with provided ids: ${localeFallbackIds.join(', ')}`);
        return [];
    }

    const fallbackDataMap: Record<string, FallbackContentData> = {};

    fallbackContents.forEach((fallbackContent) => {
        forceArray(fallbackContent.data.items).forEach((item) => {
            const { contentId, enabled, ...data } = item;

            if (!enabled) {
                return;
            }

            if (fallbackDataMap[contentId]) {
                logger.critical(
                    `Duplicate locale fallback data for ${contentId} in ${getLocaleFromContext()}`
                );
                return;
            }

            fallbackDataMap[contentId] = { ...data, sortTitle: data.sortTitle || data.title };
        });
    });

    return contents.reduce<ContentWithFallbackData<ContentType>[]>((acc, content) => {
        const fallbackDataForContent = fallbackDataMap[content._id];

        if (fallbackDataForContent) {
            acc.push({
                ...content,
                data: { ...content.data, ...fallbackDataForContent },
            });
        }

        return acc;
    }, []);
};
