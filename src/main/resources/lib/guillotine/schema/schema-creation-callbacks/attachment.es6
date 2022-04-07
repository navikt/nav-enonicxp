const graphQlLib = require('/lib/guillotine/graphql');
const { getAttachmentText } = require('./common/attachments');

const attachmentCallback = (context, params) => {
    params.fields.attachmentText = {
        type: graphQlLib.GraphQLString,
        args: {
            maxSize: graphQlLib.GraphQLInt,
        },
        resolve: (env) => {
            return getAttachmentText(env.source, env.args.maxSize);
        },
    };
};

module.exports = { attachmentCallback };
