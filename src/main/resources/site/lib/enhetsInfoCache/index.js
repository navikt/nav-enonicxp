var MIN = 60;
var HOUR = MIN * 60;
var DAY = HOUR * 24;
var HOST = app.config['norg2'] || 'https://app-q9.adeo.no/norg2/api/v1/';

var cacheLib = require('/lib/cache');
var http = require('/lib/http-client');

var endPoints = {
    alleEnheter: 'enhet',
    kontaktinformasjon: 'enhet/{0}/kontaktinformasjon',
    arbeidsfordeling: 'enhet/{0}/arbeidsfordeling',
    organisering: 'enhet/{0}/organisering',
    enhet: 'enhet/{0}',
    enhetsstatuser: 'enhet/kontaktinformasjon/organisering/{0}',
    alleOrganisering: 'enhet/kontakinformasjon/organisering/all',
    navKontorGeografiskOmraade: 'enhet/navkontor/{0}'
}

var cache;
var countyCache;
exports.get = function (key, params) {
    if (!cache) cache = cacheLib.newCache({
        size: 500,
        expire: HOUR
    });
    var enpoint = parseEndpoints(key, params);

    if (key === 'kontaktinformasjon') return safeParse(http.request({
        url: HOST + enpoint,
        method: 'GET'
    }).body);

    return cache.get(enpoint, function () {
        return safeParse(http.request({
            url: HOST + enpoint,
            method: 'GET'
        }).body)
    })
};

function parseEndpoints(key, params) {
    return endPoints[key].replace('{0}', params);
}

function safeParse(literal) {
    if (!literal) return false;
    return JSON.parse(literal);
}

exports.getCounty = function (postnr) {
    if (!countyCache) countyCache = cacheLib.newCache({
        size: 5000,
        expire: DAY * 30
    });
    return countyCache.get(postnr, function() {
        var r = safeParse(http.request({
            url: 'http://ws.geonorge.no/AdresseWS/adresse/sok?sokestreng=' + postnr,
            method: 'GET'
        }).body);
        return r.adresser.reduce(function(t, el) {
            if (!t && el.postnr === postnr) t = el.kommunenr;
            return t;
        })

    })
}