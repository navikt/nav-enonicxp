import * as contentLib from '/lib/xp/content';
import { forceArray, removeDuplicatesFilter } from '../utils/array-utils';
import { FormsOverview } from '../../site/content-types/forms-overview/forms-overview';
import { contentTypesWithFormDetails } from '../contenttype-lists';
import { ContentWithFormDetails, FormDetailsListItem, FormDetailsMap } from './types';
import { formsOverviewListItemTransformer } from './list-item-transformer';
import { isContentLocalized } from '../localization/locale-utils';
import { LocalizedContentDataFallback } from '../../site/content-types/localized-content-data-fallback/localized-content-data-fallback';
import { logger } from '../utils/logging';
import { getLocaleFromContext } from '../localization/locale-context';

type Audience = FormsOverview['audience'];
type OverviewType = FormsOverview['overviewType'];

type FallbackDataAll = NonNullable<LocalizedContentDataFallback['items']>[number];
type FallbackData = Omit<FallbackDataAll, 'enabled' | 'contentId' | 'contentQuery'>;

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

const splitByLocalizationState = (contents: ContentWithFormDetails[], language: string) => {
    const localizedContent: ContentWithFormDetails[] = [];
    const nonLocalizedContent: ContentWithFormDetails[] = [];

    contents.forEach((content) => {
        if (isContentLocalized(content) && content.language === language) {
            localizedContent.push(content);
        } else {
            nonLocalizedContent.push(content);
        }
    });

    return { localizedContent, nonLocalizedContent };
};

const transformToContentWithFallbackData = (
    contents: ContentWithFormDetails[],
    localeFallbackIds: string[]
) => {
    const fallbackContents = contentLib.query({
        count: 1000,
        contentTypes: ['no.nav.navno:localized-content-data-fallback'],
        filters: {
            ids: { values: localeFallbackIds },
        },
    }).hits;

    if (fallbackContents.length === 0) {
        logger.info('No fallback data found');
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

            fallbackDataMap[contentId] = data;
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
    const { localizedContent, nonLocalizedContent } = splitByLocalizationState(contents, language);

    if (!localeFallbackIds) {
        return localizedContent;
    }

    const nonLocalizedContentWithFallbackData = transformToContentWithFallbackData(
        nonLocalizedContent,
        localeFallbackIds
    );

    return [...localizedContent, ...nonLocalizedContentWithFallbackData];
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
        .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));
};
