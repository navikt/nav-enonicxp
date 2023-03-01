import httpClient from '/lib/http-client';

import { CreationCallback } from '../../utils/creation-callback-utils';
import { queryParamsToObject } from '../../../utils/nav-utils';

export const videoCallback: CreationCallback = (context, params) => {
    log.info('videoCallback');
    params.fields.video.resolve = (env) => {
        const { video } = env.source;
        if (!video) {
            return null;
        }

        const { accountId, mediaId } = queryParamsToObject(video);

        const qbrickImageUrl = `https://video.qbrick.com/api/v1/image/accounts/${accountId}/medias/${mediaId}/snapshot.jpg`;

        log.info(qbrickImageUrl);
        const response = httpClient.request({
            url: qbrickImageUrl,
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
            },
            connectionTimeout: 20000,
            readTimeout: 10000,
            contentType: 'image/jpeg',
        });

        log.info(JSON.stringify(response.bodyStream));
        return env.source.video;
    };
};
