const contentLib = require('/lib/xp/content');
const cacheLib = require('/lib/cache');

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
            path: item._path.replace('/www.nav.no', ''),
            enhetNr: item.data.enhet.enhetNr,
        }));
    });

const globalValues = () => {
    return {
        status: 200,
        contentType: 'application/json',
        body: { paths: getOfficeInfo() },
    };
};

exports.get = globalValues;
