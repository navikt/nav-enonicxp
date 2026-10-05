import * as contentLib from '/lib/xp/content';
import * as contextLib from '/lib/xp/context';
import {
    FieldResolver,
    ObjectTypeDefinition,
    SchemaExtension,
} from '../../utils/creation-callback-utils';
import { logger } from '../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { buildFormDetailsList } from '../../../overview-pages/oversikt-v3/form-details-utils';
import { buildProductDetailsList } from '../../../overview-pages/oversikt-v3/product-details-utils';
import { buildBasicServicesList } from '../../../overview-pages/oversikt-v3/basic-services-utils';
import { getOversiktCategory } from '../../../../lib/overview-pages/oversikt-v3/helpers';

const SIMPLE_FORM_DETAIL_TYPE = 'SimpleFormDetail';
const OUTBOUND_LINKS_TYPE = 'OutboundLinks';
const ITEM_LIST_TYPE = 'oversiktListItem';

const buildItemList = (content: contentLib.Content<'no.nav.navno:oversikt'>) => {
    if (getOversiktCategory(content.data.oversiktType) === 'formDetails') {
        return buildFormDetailsList(content);
    } else if (getOversiktCategory(content.data.oversiktType) === 'productDetails') {
        return buildProductDetailsList(content);
    } else {
        return buildBasicServicesList(content);
    }
};

export const oversiktDataCallback: SchemaExtension = (graphQL, typeName) => {
    const simpleFormDetailType: ObjectTypeDefinition = {
        description: 'Form link',
        fields: {
            path: { type: graphQL.GraphQLString },
            language: { type: graphQL.GraphQLString },
            title: { type: graphQL.GraphQLString },
            longTitle: { type: graphQL.GraphQLString },
            type: { type: graphQL.GraphQLString },
            ingress: { type: graphQL.GraphQLString },
            formNumbers: { type: graphQL.list(graphQL.GraphQLString) },
        },
    };

    const outboundLinksType: ObjectTypeDefinition = {
        description: 'Outbound links to external resources',
        fields: {
            url: { type: graphQL.GraphQLString },
            type: { type: graphQL.GraphQLString },
            language: { type: graphQL.GraphQLString },
            title: { type: graphQL.GraphQLString },
        },
    };

    const itemListType: ObjectTypeDefinition = {
        description:
            'Liste over sider med produktdetaljer, skjemadetaljer eller grunnleggende oversikt over tjenester',
        fields: {
            url: { type: graphQL.GraphQLString },
            type: { type: graphQL.GraphQLString },
            audience: { type: graphQL.GraphQLString },
            title: { type: graphQL.GraphQLString },
            sortTitle: { type: graphQL.GraphQLString },
            anchorId: { type: graphQL.GraphQLString },
            targetLanguage: { type: graphQL.GraphQLString },
            ingress: { type: graphQL.GraphQLString },
            taxonomy: { type: graphQL.list(graphQL.GraphQLString) },
            area: { type: graphQL.list(graphQL.GraphQLString) },
            detailsPath: { type: graphQL.GraphQLString },
            productLinks: { type: graphQL.list(graphQL.reference(OUTBOUND_LINKS_TYPE)) },
            subItems: { type: graphQL.list(graphQL.reference(SIMPLE_FORM_DETAIL_TYPE)) },
            illustration: { type: graphQL.reference('Content') },
        },
    };

    return {
        types: {
            [SIMPLE_FORM_DETAIL_TYPE]: simpleFormDetailType,
            [OUTBOUND_LINKS_TYPE]: outboundLinksType,
            [ITEM_LIST_TYPE]: itemListType,
        },
        creationCallbacks: {
            [typeName]: (params) => {
                params.addFields({
                    itemList: { type: graphQL.list(graphQL.reference(ITEM_LIST_TYPE)) },
                });
            },
        },
        resolvers: {
            [ITEM_LIST_TYPE]: <Record<string, FieldResolver>>{
                illustration: (env) => {
                    const { illustration } = env.source;
                    return illustration ? contentLib.get({ key: illustration }) : illustration;
                },
            },
            [typeName]: <Record<string, FieldResolver>>{
                itemList: () => {
                    const contentId = getGuillotineContentQueryBaseContentId();
                    if (!contentId) {
                        const context = contextLib.get();
                        logger.error(
                            `No contentId provided for overview-page resolver: ${JSON.stringify(context)}`
                        );
                        return [];
                    }

                    const content = contentLib.get({ key: contentId });
                    if (content?.type !== 'no.nav.navno:oversikt') {
                        logger.error(`Content not found for forms overview page id ${contentId}`);
                        return [];
                    }

                    return buildItemList(content);
                },
            },
        },
    };
};
