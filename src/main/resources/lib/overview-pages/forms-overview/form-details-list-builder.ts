import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { forceArray, removeDuplicatesFilter } from '../../utils/array-utils';
import { FormsOverview } from '../../../site/content-types/forms-overview/forms-overview';
import { contentTypesWithFormDetails } from '../../contenttype-lists';
import { ContentWithFormDetails, FormDetailsListItem, FormDetailsMap } from './types';
import { formsOverviewListItemTransformer } from './list-item-transformer';
import { ContentDataLocaleFallback } from '../../../site/content-types/content-data-locale-fallback/content-data-locale-fallback';
import { logger } from '../../utils/logging';
import { getLocaleFromContext } from '../../localization/locale-context';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { splitByLocalizationState } from '../../localization/split-by-localization-state';

type Audience = FormsOverview['audience'];
type OverviewType = FormsOverview['overviewType'];

type FallbackDataAll = NonNullable<ContentDataLocaleFallback['items']>[number];
type FallbackData = Omit<FallbackDataAll, 'enabled' | 'contentId' | 'contentQuery'>;

const sortBySortTitle = sortByLocaleCompareOnField('sortTitle');

const contentWithFormDetailsQuery = (audience: Audience, excludedContent: string[]) => {
    const { _selected: selectedAudience } = audience;

    const selectedProviderAudiences =
        selectedAudience === 'provider' &&
        audience.provider.pageType._selected === 'overview' &&
        audience.provider.pageType.overview.provider_audience;

    return contentLib.query({
        count: 2000,
        contentTypes: contentTypesWithFormDetails,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.audience._selected',
                            values: [selectedAudience],
                        },
                    },
                    {
                        exists: {
                            field: 'data.formDetailsTargets',
                        },
                    },
                    ...(selectedProviderAudiences
                        ? [
                              {
                                  hasValue: {
                                      field: 'data.audience.provider.provider_audience',
                                      values: forceArray(selectedProviderAudiences),
                                  },
                              },
                          ]
                        : []),
                ],
                mustNot: [
                    {
                        hasValue: {
                            field: 'x.no-nav-navno.previewOnly.previewOnly',
                            values: [true],
                        },
                    },
                    ...(excludedContent.length > 0
                        ? [
                              {
                                  hasValue: {
                                      field: '_id',
                                      values: excludedContent,
                                  },
                              },
                          ]
                        : []),
                ],
            },
        },
    }).hits as ContentWithFormDetails[];
};

const transformToContentWithFallbackData = (contents: Content[], localeFallbackIds: string[]) => {
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

    return contents.reduce<ContentWithFormDetails[]>((acc, content) => {
        const fallbackDataForContent = fallbackDataMap[content._id];

        if (fallbackDataForContent) {
            acc.push({
                ...content,
                data: { ...content.data, ...fallbackDataForContent },
            } as ContentWithFormDetails);
        }

        return acc;
    }, []);
};

const getContentWithFormDetails = ({
    audience,
    language,
    excludedContentIds,
    localeFallbackIds,
}: Args) => {
    const contents = contentWithFormDetailsQuery(audience, excludedContentIds);
    const { localized, nonLocalized } = splitByLocalizationState(contents, language);

    if (!localeFallbackIds) {
        return localized;
    }

    const nonLocalizedContentWithFallbackData = transformToContentWithFallbackData(
        nonLocalized,
        localeFallbackIds
    );

    return [...localized, ...nonLocalizedContentWithFallbackData];
};

const buildFormDetailsMap = (
    contentWithFormDetails: ContentWithFormDetails[],
    overviewType: OverviewType
) => {
    const formDetailsIds = contentWithFormDetails
        .map((content) => content.data.formDetailsTargets)
        .flat()
        .filter(removeDuplicatesFilter());

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
