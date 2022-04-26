import graphQlLib from '/lib/graphql';
import { getAttachmentText } from './common/attachments';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const attachmentCallback: CreationCallback = (context, params) => {
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
