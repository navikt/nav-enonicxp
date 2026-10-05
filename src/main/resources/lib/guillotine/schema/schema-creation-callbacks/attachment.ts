import { getAttachmentText } from './common/attachments';
import {
    getCurrentContentFromLocalContext,
    SchemaExtension,
} from '../../utils/creation-callback-utils';

export const attachmentCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                attachmentText: {
                    type: graphQL.GraphQLString,
                    args: { maxSize: graphQL.GraphQLInt },
                },
            });
        },
    },
    resolvers: {
        [typeName]: {
            attachmentText: (env) => {
                const contentId = getCurrentContentFromLocalContext(env)?._id;
                return getAttachmentText(contentId, env.source, env.args.maxSize);
            },
        },
    },
});
