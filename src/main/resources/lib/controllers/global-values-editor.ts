import portalLib from '/lib/xp/portal';
import httpClient from '/lib/http-client';
import { urls } from '../constants';
import { forceArray } from '../utils/nav-utils';

const frontendApiUrl = `${urls.frontendOrigin}/editor/global-values`;

export const get = () => {
    const content = portalLib.getContent();

    if (content.type !== 'no.nav.navno:global-value-set') {
        return {
            body: '<div>Ukjent feil: kunne ikke laste globale verdier</div>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

    const frontendResponse = httpClient.request({
        url: frontendApiUrl,
        method: 'POST',
        contentType: 'application/json',
        headers: { secret: app.config.serviceSecret },
        body: JSON.stringify({
            ...content,
            data: { ...content.data, valueItems: forceArray(content.data.valueItems) },
        }),
    });

    return {
        body: frontendResponse.body,
        contentType: 'text/html; charset=UTF-8',
    };
};
