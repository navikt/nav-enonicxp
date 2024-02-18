import { forceArray } from '../../utils/array-utils';
import { FormsOverview } from '../../../site/content-types/forms-overview/forms-overview';
import { FormDetailsListItem } from './types';
import { formsOverviewListItemTransformer } from './transform-to-forms-overview-item';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getFormsOverviewContent } from './get-forms-overview-content';
import { getLocalizedContentWithFallbackData } from '../common/localization';
import { buildFormDetailsMap } from './build-form-details-map';

type Audience = FormsOverview['audience'];

const sortBySortTitle = sortByLocaleCompareOnField('sortTitle');

type Args = {
    audience: Audience;
    language: string;
    overviewType: FormsOverview['overviewType'];
    excludedContentIds: string[];
    localeFallbackIds?: string[];
};

export const buildFormDetailsList = (args: Args) => {
    const { language, overviewType, audience, excludedContentIds, localeFallbackIds } = args;

    const contentWithFormDetails = getLocalizedContentWithFallbackData({
        contents: getFormsOverviewContent({ audience, excludedContentIds }),
        localeFallbackIds: forceArray(localeFallbackIds),
        language,
    });

    const formDetailsMap = buildFormDetailsMap(contentWithFormDetails, overviewType);

    const listItemTransformer = formsOverviewListItemTransformer(formDetailsMap, language);

    return contentWithFormDetails
        .reduce<FormDetailsListItem[]>((acc, content) => {
            const transformedItem = listItemTransformer(content);
            if (transformedItem) {
                acc.push(transformedItem);
            }

            return acc;
        }, [])
        .sort(sortBySortTitle);
};
