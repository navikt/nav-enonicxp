import contentLib from '/lib/xp/content';
import cacheLib from '/lib/cache';
import { appDescriptor } from '../../lib/constants';
import { stripPathPrefix } from '../../lib/utils/nav-utils';

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
            contentTypes: [`${appDescriptor}:office-information`],
        }).hits;

        return officeInfoContent.map((content) => ({
            path: stripPathPrefix(content._path),
            enhetNr: content.data.enhet.enhetNr,
        }));
    });

export const get = () => {
    return {
        status: 200,
        contentType: 'application/json',
        body: { offices: getOfficeInfo() },
    };
};
