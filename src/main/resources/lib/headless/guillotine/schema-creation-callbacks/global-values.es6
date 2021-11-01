const graphQlLib = require('/lib/guillotine/graphql');
const { getGlobalValueContent } = require('/lib/global-values/global-values');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');

const globalValueDataCallback = (context, params) => {
    params.fields.valueUsage = {
        args: { contentRef: graphQlLib.GraphQLID },
        type: graphQlLib.list(
            graphQlLib.createObjectType(context, {
                name: context.uniqueName('GlobalValueUsage'),
                description: 'Global verdi bruk',
                fields: {
                    id: { type: graphQlLib.GraphQLString },
                    path: { type: graphQlLib.GraphQLString },
                    displayName: { type: graphQlLib.GraphQLString },
                },
            })
        ),
        resolve: (env) => {
            const { contentRef } = env.args;

            if (!contentRef) {
                return null;
            }

            const content = getGlobalValueContent(contentRef);

            if (!content) {
                return null;
            }

            return getGlobalValueUsage(content._id);
        },
    };
};

module.exports = { globalValueDataCallback };
