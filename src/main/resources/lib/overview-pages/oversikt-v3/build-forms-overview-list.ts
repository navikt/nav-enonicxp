import { Content } from '/lib/xp/content';
import { forceArray } from '../../utils/array-utils';
import { OversiktListItem } from './types';
import { getFormsOverviewListItemTransformer } from './transform-to-forms-overview-item';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getFormsOverviewContent } from './get-forms-overview-content';
import { getLocalizedContentWithFallbackData } from '../common/localization';
import { buildFormDetailsMap } from './build-form-details-map';
import { logger } from '../../utils/logging';
import { getLayersData } from '../../localization/layers-data';

export const buildFormDetailsList = (
    formsOverviewContent: Content<'no.nav.navno:forms-overview'>
) => {
    const { language, data, _id } = formsOverviewContent;
    const { overviewType, audience, excludedContent, localeFallback } = data;

    if (!audience?._selected) {
        logger.error(`Audience not set for overview page ${_id} (${language})`);
        return [];
    }

    const isTransportPage =
        audience._selected === 'provider' && audience.provider.pageType?._selected === 'links';
    if (isTransportPage) {
        return [];
    }

    if (!overviewType) {
        logger.error(`Overview type not set for overview page ${_id} (${language})`);
        return [];
    }

    const listContent = getFormsOverviewContent({
        audience,
        excludedContentIds: forceArray(excludedContent),
    });

    const locale = language || getLayersData().defaultLocale;

    const localizedContent = getLocalizedContentWithFallbackData({
        contents: listContent,
        localeFallbackIds: forceArray(localeFallback),
        language: locale,
    });

    const formDetailsMap = buildFormDetailsMap(localizedContent, overviewType);

    const listItemTransformer = getFormsOverviewListItemTransformer(formDetailsMap, locale);

    return localizedContent
        .reduce<OversiktListItem[]>((acc, content) => {
            const transformedItem = listItemTransformer(content);
            if (transformedItem) {
                acc.push(transformedItem);
            }

            return acc;
        }, [])
        .sort(sortByLocaleCompareOnField('sortTitle'));
};
