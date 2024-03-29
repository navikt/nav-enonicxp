import graphQlLib from '/lib/graphql';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { getAttachmentText } from './common/attachments';

export const mediaCodeCallback: CreationCallback = (context, params) => {
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
            if (!attachment) {
                return null;
            }

            return getAttachmentText(attachment, env.args.maxSize);
        },
    };
};

export const mediaImageCallback: CreationCallback = (context, params) => {
    const imageInfoType = graphQlCreateObjectType(context, {
        name: 'ImageInfo',
        fields: {
            imageWidth: { type: graphQlLib.GraphQLInt },
            imageHeight: { type: graphQlLib.GraphQLInt },
            contentType: { type: graphQlLib.GraphQLString },
        },
    });

    params.fields.imageInfo = {
        type: imageInfoType,
        resolve: (env) => {
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
    };
};
