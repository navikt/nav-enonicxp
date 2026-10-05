import { SchemaExtension } from '../../utils/creation-callback-utils';

export const filterCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                id: { type: graphQL.GraphQLString },
            });
        },
    },
});
