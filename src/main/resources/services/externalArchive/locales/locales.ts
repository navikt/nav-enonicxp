import { Request } from '@enonic-types/core';
import { validateServiceSecretHeader } from '../../../lib/utils/auth-utils';
import { getLayersData } from '../../../lib/localization/layers-data';

// Returnerer den dynamiske locale-lista fra XP sine innholds-lag, slik at
// backfill-naisjobben i xp-archive kan loope over alle locales uten å hardkode
// settet (XP eier "hva"). Brukes sammen med nodeList (én nodeList-kall per locale).
export const externalArchiveLocalesService = (req: Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    return {
        status: 200,
        body: {
            locales: getLayersData().locales,
        },
        contentType: 'application/json',
    };
};
