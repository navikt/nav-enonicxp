import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { getLocaleFromContext } from '../localization/locale-context';
import { ContentDataLocaleFallback } from '../../site/content-types/content-data-locale-fallback/content-data-locale-fallback';

type FallbackDataAll = NonNullable<ContentDataLocaleFallback['items']>[number];
type FallbackData = Omit<FallbackDataAll, 'enabled' | 'contentId' | 'contentQuery'>;

type ContentWithFallbackData<ContentType extends Content> = ContentType & { data: FallbackData };

export const injectFallbackLocaleData = <ContentType extends Content>(
    contents: ContentType[],
    localeFallbackIds: string[]
): ContentWithFallbackData<ContentType>[] => {
    const fallbackContents = contentLib.query({
        count: 1000,
        contentTypes: ['no.nav.navno:content-data-locale-fallback'],
        filters: {
            ids: { values: localeFallbackIds },
        },
    }).hits;

    if (fallbackContents.length === 0) {
        logger.warning(`No fallback data found with provided ids: ${localeFallbackIds.join(', ')}`);
        return [];
    }

    const fallbackDataMap: Record<string, FallbackData> = {};

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
