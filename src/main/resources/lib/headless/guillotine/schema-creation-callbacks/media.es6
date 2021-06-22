const graphQlLib = require('/lib/guillotine/graphql');
const { getAttachmentText } = require('./common/attachments');

const mediaCodeCallback = (context, params) => {
    params.fields.mediaText = {
        type: graphQlLib.GraphQLString,
        args: {
            maxSize: graphQlLib.GraphQLInt,
        },
        resolve: (env) => {
            const attachmentName = env.source.data?.media?.attachment;
            if (!attachmentName) {
                return null;
            }

            const attachment = env.source.attachments?.[attachmentName];
            if (!attachmentName) {
                return null;
            }

            return getAttachmentText(attachment, env.args.maxSize);
        },
    };
};

module.exports = { mediaCodeCallback };
