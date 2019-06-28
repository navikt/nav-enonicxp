const MIN = 60;
const HOUR = MIN * 60;
const DAY = HOUR * 24;
const HOST = app.config['norg2'];

const libs = {
    cache: require('/lib/cache'),
    httpClient: require('/lib/http-client'),
};

const endPoints = {
    alleEnheter: 'enhet',
    kontaktinformasjon: 'enhet/{0}/kontaktinformasjon',
    arbeidsfordeling: 'enhet/{0}/arbeidsfordeling',
    organisering: 'enhet/{0}/organisering',
    enhet: 'enhet/{0}',
    enhetsstatuser: 'enhet/kontaktinformasjon/organisering/{0}',
    alleOrganisering: 'enhet/kontakinformasjon/organisering/all',
    navKontorGeografiskOmraade: 'enhet/navkontor/{0}',
};

let cache;
let countyCache;
exports.get = function (key, params) {
    if (!cache) {
        cache = libs.cache.newCache({
            size: 500,
            expire: HOUR,
        });
    }
    const enpoint = parseEndpoints(key, params);

    if (key === 'kontaktinformasjon') {
        return safeParse(libs.httpClient.request({
            url: HOST + enpoint,
            method: 'GET',
        }).body);
    }

    return cache.get(enpoint, function () {
        return safeParse(libs.httpClient.request({
            url: HOST + enpoint,
            method: 'GET',
        }).body);
    });
};

function parseEndpoints (key, params) {
    return endPoints[key].replace('{0}', params);
}

function safeParse (literal) {
    if (!literal) {
        return false;
    }
    return JSON.parse(literal);
}

exports.getCounty = function (postnr) {
    if (!countyCache) {
        countyCache = libs.cache.newCache({
            size: 5000,
            expire: DAY * 30,
        });
    }
    return countyCache.get(postnr, function () {
        const r = safeParse(libs.httpClient.request({
            url: 'http://ws.geonorge.no/AdresseWS/adresse/sok?sokestreng=' + postnr,
            method: 'GET',
        }).body);
        return r.adresser.reduce((t, el) => {
            if (!t && el.postnr === postnr) {
                t = el.kommunenr;
            }
            return t;
        });
    });
};
