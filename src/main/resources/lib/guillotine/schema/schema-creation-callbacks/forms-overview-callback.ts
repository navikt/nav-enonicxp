import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { forceArray } from '../../../utils/array-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { Audience } from '../../../../site/mixins/audience/audience';
import { Taxonomy } from '../../../../site/mixins/taxonomy/taxonomy';
import { Area } from '../../../../site/mixins/area/area';

type FormDetailsListItem = {
    title: string;
    sortTitle: string;
    illustration: string;
    taxonomy?: Taxonomy['taxonomy'];
    area?: Area['area'];
    formDetailsPaths: string[];
};

type ContentWithFormDetails = Content<(typeof contentTypesWithFormDetails)[number]>;

const contentTypesWithFormDetails = [
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:guide-page',
] as const;

const transformToListEntry = (content: ContentWithFormDetails): FormDetailsListItem | null => {
    const formDetailsTargets = forceArray(content.data.formDetailsTargets);

    const formDetailsContent = contentLib.query({
        count: formDetailsTargets.length,
        contentTypes: ['no.nav.navno:form-details'],
        filters: { ids: { values: formDetailsTargets } },
    }).hits;

    if (formDetailsContent.length === 0) {
        return null;
    }

    return {
        title: content.displayName,
        sortTitle: content.displayName,
        formDetailsPaths: formDetailsContent.map((formDetails) => formDetails._path),
        illustration: (content.data as any).illustration,
        area: forceArray((content.data as any).area),
        taxonomy: forceArray((content.data as any).taxonomy),
    };
};

const buildFormDetailsList = (audience: Audience['audience'], language: string) => {
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
    }).hits;

    return contentWithFormDetails.map(transformToListEntry);
};

export const formsOverviewCallback: CreationCallback = (context, params) => {
    const formDetailsList = graphQlCreateObjectType<keyof FormDetailsListItem>(context, {
        name: context.uniqueName('FormDetailsList'),
        description: 'Liste over sider med skjemadetaljer',
        fields: {
            formDetailsPaths: { type: graphQlLib.list(graphQlLib.GraphQLString) },
            sortTitle: { type: graphQlLib.GraphQLString },
            title: { type: graphQlLib.GraphQLString },
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
            const { audience } = data;

            if (!audience) {
                logger.error(`Audience not set for overview page id ${contentId}`);
                return [];
            }

            return buildFormDetailsList(audience._selected, language);
        },
    };
};
