import * as contentLib from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { forceArray, removeDuplicatesFilter } from '../../../utils/array-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { FormsOverview } from '../../../../site/content-types/forms-overview/forms-overview';
import { getPublicPath } from '../../../paths/public-path';
import { FormDetailsSelector } from '../../../../site/mixins/form-details-selector/form-details-selector';
import { ContentPageWithSidemenus } from '../../../../site/content-types/content-page-with-sidemenus/content-page-with-sidemenus';
import striptags from '/assets/striptags/3.1.1/src/striptags';

type ProductData = ContentPageWithSidemenus;

type IncludedProductData = Pick<
    ProductData,
    'title' | 'sortTitle' | 'illustration' | 'area' | 'taxonomy' | 'ingress'
>;

type FormDetailsListItem = {
    anchorId: string;
    formDetailsPaths: string[];
    formDetailsTitles: string[];
    formDetailsIngresses: string[];
    formNumbers: string[];
    keywords: string[];
    url: string | null;
    type: ContentTypeWithFormDetails;
} & Required<IncludedProductData>;

type ContentTypeWithFormDetails = (typeof contentTypesWithFormDetails)[number];

type ContentWithFormDetails = Content<ContentTypeWithFormDetails> & {
    // Fields from nested mixins are not included in the autogenerate types
    data: IncludedProductData &
        Pick<ProductData, 'externalProductUrl'> &
        Required<Pick<FormDetailsSelector, 'formDetailsTargets'>> & {
            keywords?: string | string[];
        };
};

type FormDetailsMap = Record<string, Content<'no.nav.navno:form-details'>>;

const contentTypesWithFormDetails = [
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:guide-page',
] as const;

const getUrl = (content: ContentWithFormDetails) => {
    const { externalProductUrl } = content.data;

    if (externalProductUrl) {
        // Temporary workaround for hiding the product link in the form details panel
        // by setting the external url to the nav.no origin
        return externalProductUrl === 'https://www.nav.no' ? null : externalProductUrl;
    }

    return getPublicPath(content, content.language);
};

const transformToListItem = (
    content: ContentWithFormDetails,
    formDetailsMap: FormDetailsMap
): FormDetailsListItem | null => {
    const formDetailsContents = forceArray(content.data.formDetailsTargets).reduce<
        Content<'no.nav.navno:form-details'>[]
    >((acc, formDetailsId) => {
        const formDetails = formDetailsMap[formDetailsId];
        if (formDetails) {
            acc.push(formDetails);
        }

        return acc;
    }, []);

    if (formDetailsContents.length === 0) {
        return null;
    }

    const title = content.data.title || content.displayName;
    const sortTitle = content.data.sortTitle || title;

    return {
        title,
        sortTitle,
        ingress: content.data.ingress,
        keywords: forceArray(content.data.keywords),
        url: getUrl(content),
        type: content.type,
        anchorId: sanitize(sortTitle),
        illustration: content.data.illustration,
        area: forceArray(content.data.area),
        taxonomy: forceArray(content.data.taxonomy),
        formDetailsPaths: formDetailsContents.map((formDetails) => formDetails._path),
        formDetailsTitles: formDetailsContents
            .map((formDetails) => formDetails.data.title)
            .filter(Boolean),
        formDetailsIngresses: formDetailsContents
            .map((formDetails) =>
                formDetails.data.ingress ? striptags(formDetails.data.ingress) : ''
            )
            .filter(Boolean),
        formNumbers: formDetailsContents
            .map((formDetails) => forceArray(formDetails.data.formNumbers))
            .flat(),
    };
};

const buildFormDetailsList = (
    audience: FormsOverview['audience'],
    language: string,
    overviewType: FormsOverview['overviewType'],
    excludedContent: string[]
) => {
    const { _selected: selectedAudience } = audience;

    const selectedProviderAudiences =
        selectedAudience === 'provider' &&
        audience.provider.pageType._selected === 'overview' &&
        audience.provider.pageType.overview.provider_audience;

    const contentWithFormDetails = contentLib.query({
        count: 1000,
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
                    {
                        hasValue: {
                            field: 'language',
                            values: [language],
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

    const formDetailsIds = contentWithFormDetails
        .map((content) => content.data.formDetailsTargets)
        .flat()
        .filter(removeDuplicatesFilter());

    const formDetailsMap = contentLib
        .query({
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
        })
        .hits.reduce<FormDetailsMap>((acc, formDetail) => {
            acc[formDetail._id] = formDetail;
            return acc;
        }, {});

    return contentWithFormDetails
        .reduce<FormDetailsListItem[]>((acc, content) => {
            const transformedItem = transformToListItem(content, formDetailsMap);
            if (transformedItem) {
                acc.push(transformedItem);
            }

            return acc;
        }, [])
        .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));
};

export const formsOverviewDataCallback: CreationCallback = (context, params) => {
    const formDetailsList = graphQlCreateObjectType<keyof FormDetailsListItem>(context, {
        name: context.uniqueName('FormDetailsList'),
        description: 'Liste over sider med skjemadetaljer',
        fields: {
            url: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            ingress: { type: graphQlLib.GraphQLString },
            keywords: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formDetailsPaths: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formDetailsTitles: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formDetailsIngresses: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formNumbers: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            sortTitle: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
            anchorId: { type: graphQlLib.GraphQLString },
            taxonomy: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            area: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            illustration: {
                type: graphQlLib.reference('Content'),
                resolve: (env) => {
                    const { illustration } = env.source;
                    return illustration ? contentLib.get({ key: illustration }) : illustration;
                },
            },
        },
    });

    params.fields.formDetailsList = {
        type: graphQlLib.list(formDetailsList),
        resolve: () => {
            const contentId = getGuillotineContentQueryBaseContentId();
            if (!contentId) {
                logger.error('No contentId provided for overview-page resolver');
                return [];
            }

            const content = contentLib.get({ key: contentId });
            if (content?.type !== 'no.nav.navno:forms-overview') {
                logger.error(`Content not found for forms overview page id ${contentId}`);
                return [];
            }

            const { language, data } = content;
            const { audience, overviewType, excludedContent } = data;

            if (!audience?._selected) {
                logger.error(`Audience not set for overview page id ${contentId}`);
                return [];
            }

            if (!overviewType) {
                logger.error(`Overview type not set for overview page id ${contentId}`);
                return [];
            }

            const isTransportPage =
                audience._selected === 'provider' &&
                audience.provider.pageType?._selected === 'links';
            if (isTransportPage) {
                return [];
            }

            return buildFormDetailsList(
                audience,
                language,
                overviewType,
                forceArray(excludedContent)
            );
        },
    };
};
