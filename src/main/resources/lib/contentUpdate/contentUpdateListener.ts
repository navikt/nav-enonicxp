import * as eventLib from '/lib/xp/event';
import * as contentLib from '/lib/xp/content';
import * as clusterLib from '/lib/xp/cluster';
import { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import { runInContext } from '../context/run-in-context';
import { QbrickMeta } from 'types/qbrickMeta';
import { CONTENT_REPO_PREFIX } from '../constants';
import { transformFragmentCreatorToFragment } from '../fragmentCreator/fragment-creator';
import { RepoBranch } from '../../types/common';

let hasContentUpdateListener = false;
type UpdateVideoContentParams = {
    content: Content<'no.nav.navno:video'>;
    duration: number;
    imageAsset: Content<'media:image'>;
};

const getProxyConfig = () => {
    if (app.config.env === 'localhost') {
        return {};
    }
    return {
        proxy: {
            host: 'webproxy-internett.nav.no',
            port: 8088,
        },
    };
};

const updateVideoContent = ({ content, duration, imageAsset }: UpdateVideoContentParams) => {
    contentLib.modify({
        key: content._id,
        editor: (c: Content<'no.nav.navno:video'>) => {
            c.data.duration = duration.toString();
            c.data.poster = imageAsset._id;
            return c;
        },
        requireValid: false,
    });
};

const createImageAsset = (imageUrl: string, targetPath: string, targetName: string) => {
    if (!targetName || !targetPath) {
        return null;
    }

    const response = httpClient.request({
        method: 'GET',
        url: imageUrl,
        contentType: 'image/jpeg',
        connectionTimeout: 5000,
        followRedirects: false,
        ...getProxyConfig(),
    });

    const posterExists = contentLib.exists({ key: `${targetPath}/${targetName}.jpg` });

    if (posterExists)
        contentLib.delete({
            key: `${targetPath}/${targetName}.jpg`,
        });

    return contentLib.createMedia({
        name: `${targetName}.jpg`,
        parentPath: `${targetPath}`,
        mimeType: 'image/jpeg',
        data: response.bodyStream,
    });
};

export const findImageUrlFromVideoMeta = (qbrickMediaData: QbrickMeta) => {
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

export const findVideoDurationFromMeta = (qbrickMediaData: QbrickMeta) => {
    const resources = qbrickMediaData?.asset?.resources;
    if (!resources) {
        return 0;
    }

    const firstFoundResource = resources.find((resource) => resource.type === 'video');
    const firstFoundVideo = firstFoundResource && firstFoundResource.renditions[0]?.videos;
    const duration = firstFoundVideo && firstFoundVideo[0]?.duration;

    return duration || 0;
};

const fetchMetaDataFromQbrick = (accountId: number, mediaId: string) => {
    const qbrickURI = `https://video.qbrick.com/api/v1/public/accounts/${accountId}/medias/${mediaId}`;

    try {
        const response = httpClient.request({
            method: 'GET',
            url: qbrickURI,
            connectionTimeout: 8000,
            followRedirects: false,
            ...getProxyConfig(),
        });

        if (response.status !== 200 || !response.body) {
            log.error(
                `Failed to fetch video data from Qbrick. Response status: ${response.status}, Attempted qbruck url: ${qbrickURI}`
            );
            return null;
        }

        const data = JSON.parse(response.body) as QbrickMeta;
        const duration = findVideoDurationFromMeta(data);
        const imageURI = findImageUrlFromVideoMeta(data);
        return { duration, imageURI };
    } catch (e) {
        log.error(
            `Failed to fetch video data from Qbrick. Attempted qBrick url: ${qbrickURI}. Error message: ${JSON.stringify(
                e
            )}`
        );
        return null;
    }
};

const updateVideoContentWithMetaData = (content: Content<'no.nav.navno:video'>) => {
    log.info('Updating video content with metadata from Qbrick');
    const { accountId, mediaId } = content.data;

    // Don't override any posters or durations already set or set manually
    // by the editor.
    if (content.data.poster || content.data.duration) {
        return;
    }

    const qbrickMetadata = fetchMetaDataFromQbrick(accountId, mediaId);

    if (!qbrickMetadata || !(qbrickMetadata.duration && qbrickMetadata.imageURI)) {
        return;
    }

    runInContext({ branch: 'draft', asAdmin: true }, () => {
        const { duration, imageURI } = qbrickMetadata;
        const imageAsset = imageURI && createImageAsset(imageURI, content._path, content._name);
        if (imageAsset) {
            updateVideoContent({ duration, imageAsset, content });
        }
    });
};

const handleEvent = (event: eventLib.EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        const { id, branch, repo } = node;

        if (!repo.startsWith(CONTENT_REPO_PREFIX)) {
            return;
        }

        const content = contentLib.get({ key: id });
        if (!content) {
            return;
        }

        switch (content.type) {
            case 'no.nav.navno:video': {
                updateVideoContentWithMetaData(content);
                break;
            }
            case 'no.nav.navno:fragment-creator': {
                transformFragmentCreatorToFragment({
                    content,
                    branch: branch as RepoBranch,
                    repoId: repo,
                });
                break;
            }
        }
    });
};

export const activateContentUpdateListener = () => {
    if (hasContentUpdateListener) {
        return;
    }

    hasContentUpdateListener = true;

    eventLib.listener({
        type: 'node.updated',
        callback: handleEvent,
    });
};
