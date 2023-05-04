import * as contentLib from '/lib/xp/content';
import cacheLib from '/lib/cache';
import { APP_DESCRIPTOR } from '../../lib/constants';

const tenMinutes = 600;

const cache = cacheLib.newCache({
    size: 1,
    expire: tenMinutes,
});

const getOfficeInfo = () =>
    cache.get('officeInfo', () => {
        const officeInfoContent = contentLib.query({
            start: 0,
            count: 1000,
            contentTypes: [`${APP_DESCRIPTOR}:office-branch`],
            query: '_path LIKE "/content/www.nav.no/kontor/*"',
        }).hits;

        return officeInfoContent.map((content) => ({
            path: content._path,
            enhetNr: content.data.enhetNr,
        }));
    });

export const get = () => {
    return {
        status: 200,
        contentType: 'application/json',
        body: { offices: getOfficeInfo() },
    };
};
