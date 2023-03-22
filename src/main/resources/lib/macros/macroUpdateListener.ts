import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import httpClient from '/lib/http-client';
import * as contentLib from '/lib/xp/content';
import { findNestedKey } from '../../lib/utils/object-utils';

let didActivateListener = false;

const handleEvent = (event: eventLib.EnonicEvent) => {
    log.info('handleEvent');
    const { id } = event.data.nodes[0];
    const content = contentLib.get({ key: id });

    if (!content || content.type !== 'no.nav.navno:video') {
        log.info('Not a video content');
        return;
    }

    const { mediaId, accountId } = content.data;

    const qbrickURL = ` https://video.qbrick.com/api/v1/public/accounts/${accountId}/medias/${mediaId}`;

    try {
        log.info('fetching video data from Qbrick');
        const response = httpClient.request({
            method: 'GET',
            url: qbrickURL,
            connectionTimeout: 5000,
            followRedirects: false,
        });

        if (!response.body) {
            throw Error('No body in response');
        }

        const data = JSON.parse(response.body);

        const duration = findNestedKey(data, 'duration');
        const links = findNestedKey(data, 'links');
        const imageURl = links[0].href;

        log.error(`duration: ${duration}`);
        log.error(`imageURl: ${imageURl}`);
    } catch (e) {
        log.error('Failed to fetch video data from Qbrick', e);
    }
};

export const activateMacroUpdateListener = () => {
    if (didActivateListener) {
        return;
    }

    didActivateListener = true;

    eventLib.listener({
        type: 'node.pushed',
        callback: handleEvent,
    });
};
