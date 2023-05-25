import * as contentLib from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { forceArray, removeDuplicatesFilter } from '../../../utils/array-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { Audience } from '../../../../site/mixins/audience/audience';
import { FormsOverview } from '../../../../site/content-types/forms-overview/forms-overview';
import { ProductData } from '../../../../site/mixins/product-data/product-data';
import { getPublicPath } from '../../../paths/public-path';
import { FormDetailsSelector } from '../../../../site/mixins/form-details-selector/form-details-selector';

type IncludedProductData = Pick<
    ProductData,
    'title' | 'sortTitle' | 'illustration' | 'area' | 'taxonomy' | 'ingress'
>;

type FormDetailsListItem = {
    anchorId: string;
    formDetailsPaths: string[];
    formDetailsTitles: string[];
    formNumbers: string[];
    url: string;
    type: ContentTypeWithFormDetails;
} & Required<IncludedProductData>;

type ContentTypeWithFormDetails = (typeof contentTypesWithFormDetails)[number];

type ContentWithFormDetails = Content<ContentTypeWithFormDetails> & {
    // Fields from nested mixins are not included in the autogenerate types
    data: IncludedProductData &
        Pick<ProductData, 'externalProductUrl'> &
        Required<Pick<FormDetailsSelector, 'formDetailsTargets'>>;
};

type FormDetailsMap = Record<string, Content<'no.nav.navno:form-details'>>;

const contentTypesWithFormDetails = [
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:guide-page',
] as const;

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

    const url = content.data.externalProductUrl || getPublicPath(content, content.language);

    return {
        title,
        sortTitle,
        ingress: content.data.ingress,
        url,
        type: content.type,
        anchorId: sanitize(sortTitle),
        illustration: content.data.illustration,
        area: forceArray(content.data.area),
        taxonomy: forceArray(content.data.taxonomy),
        formDetailsPaths: formDetailsContents.map((formDetails) => formDetails._path),
        formDetailsTitles: formDetailsContents.map((formDetails) => formDetails.data.title || ''),
        formNumbers: formDetailsContents
            .map((formDetails) => forceArray(formDetails.data.formNumbers))
            .flat(),
    };
};

const buildFormDetailsList = (
    audience: Audience['audience']['_selected'],
    language: string,
    overviewType: FormsOverview['overviewType']
) => {
    const contentWithFormDetails = contentLib.query({
        count: 1000,
        contentTypes: contentTypesWithFormDetails,
        filters: {
            boolean: {
                should: [
                    {
                        hasValue: {
                            field: 'data.audience',
                            values: [audience],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data.audience._selected',
                            values: [audience],
                        },
                    },
                ],
                must: [
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
                ],
                mustNot: [
                    {
                        hasValue: {
                            field: 'x.no-nav-navno.previewOnly.previewOnly',
                            values: [true],
                        },
                    },
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
            formDetailsPaths: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            formDetailsTitles: { type: graphQlLib.list(graphQlLib.GraphQLString) },
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
            const { audience, overviewType } = data;

            if (!audience) {
                logger.error(`Audience not set for overview page id ${contentId}`);
                return [];
            }

            if (!overviewType) {
                logger.error(`Overview type not set for overview page id ${contentId}`);
                return [];
            }

            return buildFormDetailsList(audience._selected, language, overviewType);
        },
    };
};
