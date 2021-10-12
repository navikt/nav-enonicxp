const contentLib = require('/lib/xp/content');
const cacheLib = require('/lib/cache');
const { frontendOrigin } = require('/lib/headless/url-origin');

const officeContentType = `${app.name}:office-information`;

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
            contentTypes: [officeContentType],
        }).hits;

        return officeInfoContent.map((item) => ({
            name: item.data.enhet.navn,
            url: item._path.replace('/www.nav.no', frontendOrigin),
            path: item._path.replace('/www.nav.no', 'frontendOrigin'), // TODO: remove this after frontend update
            enhetNr: item.data.enhet.enhetNr,
        }));
    });

const officeInfo = () => {
    return {
        status: 200,
        contentType: 'application/json',
        body: { offices: getOfficeInfo() },
    };
};

exports.get = officeInfo;
