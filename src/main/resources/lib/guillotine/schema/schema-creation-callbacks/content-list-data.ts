import { SchemaExtension } from '../../utils/creation-callback-utils';

export const contentListDataCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                sortedBy: { type: graphQL.GraphQLString },
            });
        },
    },
});
