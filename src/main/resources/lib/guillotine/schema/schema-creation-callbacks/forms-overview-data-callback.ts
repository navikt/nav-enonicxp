import * as contentLib from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { forceArray } from '../../../utils/array-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { Audience } from '../../../../site/mixins/audience/audience';
import { Taxonomy } from '../../../../site/mixins/taxonomy/taxonomy';
import { Area } from '../../../../site/mixins/area/area';
import { FormsOverview } from '../../../../site/content-types/forms-overview/forms-overview';

type FormDetailsListItem = {
    title: string;
    sortTitle: string;
    anchorId: string;
    illustration: string;
    taxonomy: Taxonomy['taxonomy'];
    area: Area['area'];
    formDetailsPaths: string[];
};

type ContentWithFormDetails = Content<(typeof contentTypesWithFormDetails)[number]> & {
    // Fields from nested mixins are not included in the autogenerate types
    data: {
        title?: string;
        sortTitle?: string;
        illustration: string;
        area: Area['area'];
        taxonomy: Taxonomy['taxonomy'];
    };
};

const contentTypesWithFormDetails = [
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:guide-page',
] as const;

const transformToListItem = (
    content: ContentWithFormDetails,
    overviewType: FormsOverview['overviewType']
): FormDetailsListItem | null => {
    const formDetailsTargets = forceArray(content.data.formDetailsTargets);

    const formDetailsContent = contentLib.query({
        count: formDetailsTargets.length,
        contentTypes: ['no.nav.navno:form-details'],
        filters: {
            ids: {
                values: formDetailsTargets,
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

    if (formDetailsContent.length === 0) {
        return null;
    }

    const title = content.data.title || content.displayName;
    const sortTitle = content.data.sortTitle || title;

    return {
        title,
        sortTitle,
        anchorId: sanitize(sortTitle),
        formDetailsPaths: formDetailsContent.map((formDetails) => formDetails._path),
        illustration: content.data.illustration,
        area: forceArray(content.data.area),
        taxonomy: forceArray(content.data.taxonomy),
    };
};

const buildFormDetailsList = (
    audience: Audience['audience'],
    language: string,
    overviewType: FormsOverview['overviewType']
) => {
    const contentWithFormDetails = contentLib.query({
        count: 1000,
        contentTypes: contentTypesWithFormDetails,
        filters: {
            boolean: {
                must: [
                    {
                        exists: {
                            field: 'data.formDetailsTargets',
                        },
                    },
                    {
                        hasValue: {
                            field: 'data.audience',
                            values: [audience],
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

    return contentWithFormDetails
        .reduce<FormDetailsListItem[]>((acc, content) => {
            const transformedItem = transformToListItem(content, overviewType);
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
            formDetailsPaths: { type: graphQlLib.list(graphQlLib.GraphQLString) },
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
