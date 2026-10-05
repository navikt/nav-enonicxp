import { ObjectTypeDefinition, SchemaExtension } from '../../utils/creation-callback-utils';
import {
    GlobalNumberValueItem,
    GlobalNumberValueSetData,
} from '../../../../types/content-types/global-value-set';
import { forceArray } from '../../../utils/array-utils';

const VALUE_ITEM_TYPE = 'GlobalValueItem';
const DATA_TYPE = 'no_nav_navno_GlobalValueSet_Data';

export const globalValueSetCallback: SchemaExtension = (graphQL, typeName) => {
    const valueItemType: ObjectTypeDefinition<keyof GlobalNumberValueItem> = {
        description: 'Global verdi',
        fields: {
            key: { type: graphQL.GraphQLString },
            itemName: { type: graphQL.GraphQLString },
            numberValue: { type: graphQL.GraphQLFloat },
            type: { type: graphQL.GraphQLString },
        },
    };

    const dataType: ObjectTypeDefinition<keyof GlobalNumberValueSetData> = {
        description: 'Data for globale verdier',
        fields: {
            valueItems: { type: graphQL.list(graphQL.reference(VALUE_ITEM_TYPE)) },
        },
    };

    return {
        types: {
            [VALUE_ITEM_TYPE]: valueItemType,
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
                valueItems: (env) =>
                    forceArray(env.source.valueItems).map((item) => ({
                        ...item,
                        // Set the type here for backwards compatibility with values created
                        // when we only had one global value type (and this field did not exist)
                        type: 'numberValue',
                    })),
            },
        },
    };
};
