import { ObjectTypeDefinition, SchemaExtension } from '../../utils/creation-callback-utils';
import {
    GlobalCaseTimeSetData,
    CaseTimeItem,
} from '../../../../types/content-types/global-case-time-set';
import { forceArray } from '../../../utils/array-utils';

const CASE_TIME_ITEM_TYPE = 'CaseTimeItem';
const DATA_TYPE = 'no_nav_navno_GlobalCaseTimeSet_Data';

export const globalCaseTimeSetCallback: SchemaExtension = (graphQL, typeName) => {
    const caseTimeItemType: ObjectTypeDefinition<keyof CaseTimeItem> = {
        description: 'Saksbehandlingstid',
        fields: {
            key: { type: graphQL.GraphQLString },
            unit: { type: graphQL.GraphQLString },
            value: { type: graphQL.GraphQLInt },
            itemName: { type: graphQL.GraphQLString },
            type: { type: graphQL.GraphQLString },
        },
    };

    const dataType: ObjectTypeDefinition<keyof GlobalCaseTimeSetData> = {
        description: 'Data for saksbehandlingstider',
        fields: {
            valueItems: { type: graphQL.list(graphQL.reference(CASE_TIME_ITEM_TYPE)) },
        },
    };

    return {
        types: {
            [CASE_TIME_ITEM_TYPE]: caseTimeItemType,
            [DATA_TYPE]: dataType,
        },
        creationCallbacks: {
            [typeName]: (params) => {
                params.addFields({
                    data: { type: graphQL.reference(DATA_TYPE) },
                });
            },
        },
        resolvers: {
            [DATA_TYPE]: {
                valueItems: (env): CaseTimeItem[] =>
                    forceArray(env.source.valueItems).map((item) => ({
                        ...item,
                        type: 'caseTime',
                    })),
            },
        },
    };
};
