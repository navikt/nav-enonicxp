import graphQlLib, { CreateObjectTypeParams } from '/lib/graphql';
import { Context } from '/lib/guillotine';
import { getAttachmentText } from './common/attachments';

export const attachmentCallback = (context: Context, params: CreateObjectTypeParams) => {
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
