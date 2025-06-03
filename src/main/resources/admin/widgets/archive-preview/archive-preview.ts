import httpClient, { HttpResponse } from '/lib/http-client';

import thymeleafLib from '/lib/thymeleaf';

const view = resolve('./archive-preview.html');

export const get = (req: XP.Request) => {
    const model = { invalidate: 'https://www.nav.no' };

    log.info(`Preview site engine request: ${JSON.stringify(req)}`);

    const response = httpClient.request({
        url: 'http://localhost:8080/admin/site/inline/navno-engelsk/draft/barnetrygd-copy-2',
        method: 'GET',
        contentType: 'application/json',
        headers: {
            secret: app.config.serviceSecret,
        },
    });

    log.info(`Fetch result: ${JSON.stringify(response)}`);

    return {
        headers: {
            'X-Frame-Options': 'SAMEORIGIN',
        },
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};
