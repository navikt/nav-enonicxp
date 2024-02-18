import { Content } from '/lib/xp/content';
import { forceArray } from '../../utils/array-utils';
import { FormDetailsListItem } from './types';
import { formsOverviewListItemTransformer } from './transform-to-forms-overview-item';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getFormsOverviewContent } from './get-forms-overview-content';
import { getLocalizedContentWithFallbackData } from '../common/localization';
import { buildFormDetailsMap } from './build-form-details-map';

export const buildFormDetailsList = (
    formsOverviewContent: Content<'no.nav.navno:forms-overview'>
) => {
    const { language, data } = formsOverviewContent;
    const { overviewType, audience, excludedContent, localeFallback } = data;

    const listContent = getFormsOverviewContent({
        audience,
        excludedContentIds: forceArray(excludedContent),
    });

    const localizedContent = getLocalizedContentWithFallbackData({
        contents: listContent,
        localeFallbackIds: forceArray(localeFallback),
        language,
    });

    const formDetailsMap = buildFormDetailsMap(localizedContent, overviewType);

    const listItemTransformer = formsOverviewListItemTransformer(formDetailsMap, language);

    return localizedContent
        .reduce<FormDetailsListItem[]>((acc, content) => {
            const transformedItem = listItemTransformer(content);
            if (transformedItem) {
                acc.push(transformedItem);
            }

            return acc;
        }, [])
        .sort(sortByLocaleCompareOnField('sortTitle'));
};
