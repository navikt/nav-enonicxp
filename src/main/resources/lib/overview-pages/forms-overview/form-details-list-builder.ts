import * as contentLib from '/lib/xp/content';
import { forceArray } from '../../utils/array-utils';
import { FormsOverview } from '../../../site/content-types/forms-overview/forms-overview';
import { ContentWithFormDetails, FormDetailsListItem, FormDetailsMap } from './types';
import { formsOverviewListItemTransformer } from './list-item-transformer';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { splitByLocalizationState } from '../../localization/split-by-localization-state';
import { getFormsOverviewContentPages } from './get-product-pages-for-forms-overview';
import { injectFallbackLocaleData } from '../inject-fallback-locale-data';

type Audience = FormsOverview['audience'];
type OverviewType = FormsOverview['overviewType'];

const sortBySortTitle = sortByLocaleCompareOnField('sortTitle');

const getContentWithFormDetails = ({
    audience,
    language,
    excludedContentIds,
    localeFallbackIds,
}: Args) => {
    const contents = getFormsOverviewContentPages({ audience, excludedContentIds });
    const { localized, nonLocalized } = splitByLocalizationState(contents, language);

    if (!localeFallbackIds) {
        return localized;
    }

    const nonLocalizedContentWithFallbackData = injectFallbackLocaleData(
        nonLocalized,
        localeFallbackIds
    );

    return [...localized, ...nonLocalizedContentWithFallbackData];
};

const buildFormDetailsMap = (
    contentWithFormDetails: ContentWithFormDetails[],
    overviewType: OverviewType
) => {
    const formDetailsIdsSet: Record<string, true> = {};

    contentWithFormDetails.forEach((content) => {
        forceArray(content.data.formDetailsTargets).forEach(
            (targetId) => (formDetailsIdsSet[targetId] = true)
        );
    }, []);

    const formDetailsIds = Object.keys(formDetailsIdsSet);

    const formDetailsContent = contentLib.query({
        count: formDetailsIds.length,
        contentTypes: ['no.nav.navno:form-details'],
        filters: {
            ids: {
                values: formDetailsIds,
            },
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.formType._selected',
                            values: [overviewType],
                        },
                    },
                ],
            },
        },
    }).hits;

    return formDetailsContent.reduce<FormDetailsMap>((acc, formDetail) => {
        acc[formDetail._id] = formDetail;
        return acc;
    }, {});
};

type Args = {
    audience: Audience;
    language: string;
    overviewType: OverviewType;
    excludedContentIds: string[];
    localeFallbackIds?: string[];
};

export const buildFormDetailsList = (args: Args) => {
    const { language, overviewType } = args;

    const contentWithFormDetails = getContentWithFormDetails(args);

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
