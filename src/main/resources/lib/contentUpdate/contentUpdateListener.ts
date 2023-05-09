import * as eventLib from '/lib/xp/event';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import { findNestedKey } from '../utils/object-utils';
import { runInContext } from '../context/run-in-context';

let hasContentUpdateListener = false;
type UpdateVideoContentParams = {
    content: Content<'no.nav.navno:video'>;
    duration: number;
    imageAsset: Content<'media:image'>;
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

const createImageAsset = (imageUrl: string, targetPath: string) => {
    const response = httpClient.request({
        method: 'GET',
        url: imageUrl,
        contentType: 'image/jpeg',
        connectionTimeout: 5000,
        followRedirects: false,
    });

    return contentLib.createMedia({
        name: 'posterImage',
        parentPath: `${targetPath}`,
        mimeType: 'image/jpeg',
        data: response.bodyStream,
    });
};

const fetchMetaDataFromQbrick = (accountId: number, mediaId: string) => {
    const qbrickURL = ` https://video.qbrick.com/api/v1/public/accounts/${accountId}/medias/${mediaId}`;

    try {
        const response = httpClient.request({
            method: 'GET',
            url: qbrickURL,
            connectionTimeout: 5000,
            followRedirects: false,
        });

        if (response.status !== 200 || !response.body) {
            log.error(
                `Failed to fetch video data from Qbrick. Response status: ${response.status}, Attempted qbruck url: ${qbrickURL}`
            );
            return null;
        }

        const data = JSON.parse(response.body);
        const duration = findNestedKey(data, 'duration');
        const links = findNestedKey(data, 'links');
        const imageURl = links.length > 0 ? links[0].href : null;
        return { duration, imageURl };
    } catch (e) {
        log.error('Failed to fetch video data from Qbrick', e);
        return null;
    }
};

const updateVideoContentWithMetaData = (content: Content<'no.nav.navno:video'>) => {
    const { accountId, mediaId } = content.data;

    // Don't override any posters or durations already set or set manually
    // by the editor.
    if (content.data.poster || content.data.duration) {
        return;
    }

    const qbrickMetadata = fetchMetaDataFromQbrick(accountId, mediaId);

    if (!qbrickMetadata || !(qbrickMetadata.duration && qbrickMetadata.imageURl)) {
        return;
    }

    runInContext({ branch: 'draft', asAdmin: true }, () => {
        const { duration, imageURl } = qbrickMetadata;
        const imageAsset = createImageAsset(imageURl, content._path);
        updateVideoContent({ duration, imageAsset, content });
    });
};

const handleEvent = (event: eventLib.EnonicEvent) => {
    const { id } = event.data.nodes[0];
    const content = contentLib.get({ key: id });

    if (content && content.type === 'no.nav.navno:video') {
        updateVideoContentWithMetaData(content);
    }
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
