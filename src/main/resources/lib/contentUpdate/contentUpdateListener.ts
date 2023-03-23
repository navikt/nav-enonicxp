import * as eventLib from '/lib/xp/event';
import { Content } from '/lib/xp/content';
import httpClient from '/lib/http-client';
import * as contentLib from '/lib/xp/content';
import { findNestedKey } from '../utils/object-utils';
import { runInContext } from '../context/run-in-context';

let didActivateListener = false;
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
        const imageURl = links[0].href;
        return { duration, imageURl };
    } catch (e) {
        log.error('Failed to fetch video data from Qbrick', e);
        return null;
    }
};

const updateVideoContentWithMedaData = (content: Content<'no.nav.navno:video'>) => {
    const { accountId, mediaId } = content.data;

    if (content.data.poster || content.data.duration) {
        return;
    }

    const qbrickMetadata = fetchMetaDataFromQbrick(accountId, mediaId);

    if (!qbrickMetadata) {
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
        updateVideoContentWithMedaData(content);
    }
};

export const activateMacroUpdateListener = () => {
    if (didActivateListener) {
        return;
    }

    didActivateListener = true;

    eventLib.listener({
        type: 'node.updated',
        callback: handleEvent,
    });
};
