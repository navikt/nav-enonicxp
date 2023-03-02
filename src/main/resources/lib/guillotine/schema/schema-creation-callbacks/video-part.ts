const httpClientLib = require('/lib/http-client');
import graphQlLib from '/lib/graphql';

import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { queryParamsToObject } from '../../../utils/nav-utils';
import { QbrickMeta, Resource } from 'types/qbrickMeta';
import { logger } from '../../../utils/logging';

// Todo: Skrive om disse to funksjonene for bedre gjenbruk. De er nesten like.
const findImageUrlFromVideoMeta = (qbrickMediaData: QbrickMeta) => {
    const resources = qbrickMediaData?.asset?.resources;
    if (!resources) {
        return null;
    }
    const firstImageResource = resources?.find((resource: Resource) => resource.type === 'image');
    if (!firstImageResource) {
        return null;
    }

    const smallestRendition = firstImageResource.renditions?.find(
        (rendition) => rendition.width === 256
    );

    if (!smallestRendition) {
        return null;
    }

    return smallestRendition.links?.find((link) => link.mimeType === 'image/jpg')?.href || null;
};

const findVideoDurationFromMeta = (qbrickMediaData: QbrickMeta) => {
    const resources = qbrickMediaData?.asset?.resources;
    if (!resources) {
        return 0;
    }
    const firstVideoResource = resources?.find((resource: Resource) => resource.type === 'video');
    if (!firstVideoResource) {
        return 0;
    }

    const firstRentition = firstVideoResource.renditions?.find(
        (rendition) => rendition.type === 'video'
    );

    if (!firstRentition) {
        return 0;
    }

    const firstVideo = firstRentition.videos?.[0];
    if (!firstVideo) {
        return 0;
    }
    return firstVideo.duration;
};

export const videoCallback: CreationCallback = (context, params) => {
    params.fields.video = {
        type: graphQlCreateObjectType(context, {
            name: context.uniqueName('VideoMeta'),
            description: 'VideoMeta',
            fields: {
                videoUrl: { type: graphQlLib.GraphQLString },
                imageUrl: { type: graphQlLib.GraphQLString },
                duration: { type: graphQlLib.GraphQLString },
            },
        }),
        resolve: (env) => {
            const videoUrl = env.source.video;
            if (!videoUrl) {
                return null;
            }

            const { accountId, mediaId } = queryParamsToObject(videoUrl);
            const qbrickMediaData = `https://video.qbrick.com/api/v1/public/accounts/${accountId}/medias/${mediaId}`;

            try {
                const response: any = httpClientLib.request({
                    url: qbrickMediaData,
                    method: 'GET',
                    contentType: 'application/json',
                    connectionTimeout: 1000,
                    readTimeout: 1000,
                });

                if (response.status !== 200) {
                    throw new Error('Could not fetch video meta data');
                }

                log.info(JSON.stringify(response));

                const qbrikMeta: QbrickMeta = JSON.parse(response.body);

                const imageUrl = findImageUrlFromVideoMeta(qbrikMeta);
                const duration = findVideoDurationFromMeta(qbrikMeta);

                return {
                    videoUrl,
                    imageUrl,
                    duration,
                };
            } catch (e) {
                logger.warning('Could not load qbrick video meta data within 1 second.');
                return {
                    videoUrl,
                    imageUrl: null,
                    duration: null,
                };
            }
        },
    };
};
