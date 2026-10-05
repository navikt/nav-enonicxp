import { SchemaExtension } from '../../utils/creation-callback-utils';
import { getAttachmentText } from './common/attachments';

export const mediaCodeCallback: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                mediaText: {
                    type: graphQL.GraphQLString,
                    args: { maxSize: graphQL.GraphQLInt },
                },
            });
        },
    },
    resolvers: {
        [typeName]: {
            mediaText: (env) => {
                const attachmentName = env.source.data?.media?.attachment;
                if (!attachmentName) {
                    return null;
                }

                const attachment = env.source.attachments?.[attachmentName];
                if (!attachment) {
                    return null;
                }

                return getAttachmentText(env.source._id, attachment, env.args.maxSize);
            },
        },
    },
});

export const mediaImageCallback: SchemaExtension = (graphQL, typeName) => ({
    types: {
        ImageInfo: {
            fields: {
                imageWidth: { type: graphQL.GraphQLInt },
                imageHeight: { type: graphQL.GraphQLInt },
                contentType: { type: graphQL.GraphQLString },
            },
        },
    },
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                imageInfo: { type: graphQL.reference('ImageInfo') },
            });
        },
    },
    resolvers: {
        [typeName]: {
            imageInfo: (env) => {
                if (!env.source.x?.media?.imageInfo) {
                    return null;
                }

                const { imageHeight, imageWidth, contentType } = env.source.x.media.imageInfo;

                return {
                    imageWidth: Number(imageWidth),
                    imageHeight: Number(imageHeight),
                    contentType: contentType,
                };
            },
        },
    },
});
