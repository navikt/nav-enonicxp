import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { forceArray } from '../utils/array-utils';
import { QbrickMeta } from '../../types/qbrickMeta';

type UpdateVideoContentParams = {
    videoContentId: string;
    duration: number | string;
    posterImageId: string;
    subtitles?: string[];
};

const proxyConfig =
    app.config.env === 'localhost'
        ? {}
        : {
              proxy: {
                  host: 'webproxy-internett.nav.no',
                  port: 8088,
              },
          };

const updateVideoContent = ({
    videoContentId,
    posterImageId,
    duration,
    subtitles,
}: UpdateVideoContentParams) => {
    contentLib.modify<'no.nav.navno:video'>({
        key: videoContentId,
        requireValid: false,
        editor: (content) => {
            content.data.duration = duration.toString();
            content.data.poster = posterImageId;
            content.data.subtitles = subtitles;

            return content;
        },
    });
};

const createImageAsset = (imageUrl: string, targetPath: string, targetName: string) => {
    const response = httpClient.request({
        method: 'GET',
        url: imageUrl,
        contentType: 'image/jpeg',
        connectionTimeout: 5000,
        followRedirects: false,
        ...proxyConfig,
    });

    const posterExists = contentLib.exists({ key: `${targetPath}/${targetName}.jpg` });
    if (posterExists) {
        contentLib.delete({
            key: `${targetPath}/${targetName}.jpg`,
        });
    }

    return contentLib.createMedia<Content<'media:image'>>({
        name: `${targetName}.jpg`,
        parentPath: `${targetPath}`,
        mimeType: 'image/jpeg',
        data: response.bodyStream,
    });
};

const findImageUrl = (qbrickMediaData: QbrickMeta) => {
    const resources = qbrickMediaData?.asset?.resources;
    if (!resources) {
        return;
    }

    const qBrickPickedThumbnail = qbrickMediaData.thumbnails && qbrickMediaData.thumbnails[0]?.id;

    let image = resources.find(
        (resource) => resource.type === 'image' && resource.id === qBrickPickedThumbnail
    );

    // No specific thumbnail picked in the Qbrick UI, so use first image
    if (!image) {
        image = resources.find((resource) => resource.type === 'image');
    }

    if (!image) {
        return;
    }

    const imageLink = image.renditions[0]?.links[0]?.href;

    return imageLink;
};

const findVideoDuration = (qbrickMediaData: QbrickMeta) => {
    const resources = qbrickMediaData?.asset?.resources;
    if (!resources) {
        return 0;
    }

    const firstFoundResource = resources.find((resource) => resource.type === 'video');
    const firstFoundVideo = firstFoundResource && firstFoundResource.renditions[0]?.videos;
    const duration = firstFoundVideo && firstFoundVideo[0]?.duration;

    return duration || 0;
};

const findSubtitleLanguages = (qbrickMediaData: QbrickMeta) => {
    return forceArray(qbrickMediaData?.asset?.resources).reduce<string[]>((acc, resource) => {
        const { type, language } = resource;

        if (type === 'subtitle' && language) {
            acc.push(language);
        }
        return acc;
    }, []);
};

const fetchMetaData = (accountId: number, mediaId: string) => {
    const qbrickURI = `https://video.qbrick.com/api/v1/public/accounts/${accountId}/medias/${mediaId}`;

    try {
        const response = httpClient.request({
            method: 'GET',
            url: qbrickURI,
            connectionTimeout: 8000,
            followRedirects: false,
            ...proxyConfig,
        });

        if (response.status !== 200 || !response.body) {
            log.error(
                `Failed to fetch video data from Qbrick. Response status: ${response.status}, Attempted qbruck url: ${qbrickURI}`
            );
            return null;
        }

        const data = JSON.parse(response.body) as QbrickMeta;

        const duration = findVideoDuration(data);
        const imageURI = findImageUrl(data);
        const subtitles = findSubtitleLanguages(data);

        return { duration, imageURI, subtitles };
    } catch (e) {
        log.error(
            `Failed to fetch video data from Qbrick. Attempted qBrick url: ${qbrickURI}. Error message: ${JSON.stringify(
                e
            )}`
        );
        return null;
    }
};

export const updateQbrickVideoContent = (content: Content<'no.nav.navno:video'>) => {
    const { accountId, mediaId } = content.data;

    logger.info(`Updating video content with metadata from Qbrick - ${accountId} - ${mediaId}`);

    const qbrickMetadata = fetchMetaData(accountId, mediaId);
    if (!qbrickMetadata) {
        return;
    }

    const { duration, imageURI, subtitles } = qbrickMetadata;
    if (!duration || !imageURI) {
        return;
    }

    runInContext({ branch: 'draft', asAdmin: true }, () => {
        // Keep the existing poster image if it exists
        const imageAssetId =
            content.data.poster || createImageAsset(imageURI, content._path, content._name)?._id;

        if (!imageAssetId) {
            return;
        }

        updateVideoContent({
            duration,
            posterImageId: imageAssetId,
            videoContentId: content._id,
            subtitles,
        });
    });
};
