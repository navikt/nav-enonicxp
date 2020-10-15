const portalLib = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');

const maxQueryLength = 200;

const handleGet = (req) => {
    const serviceUrl = portalLib.serviceUrl({
        service: 'search',
        application: 'navno.nav.no.search',
        type: 'absolute',
    });

    const { ord, uf } = req.params;

    const params = {
        ...req.params,
        debug: true,
        ord: ord ? encodeURI(ord.slice(0, maxQueryLength)) : '',
        uf: Array.isArray(uf) ? JSON.stringify(uf) : uf,
    };

    try {
        const response = httpClient.request({ url: serviceUrl, params: params, method: 'GET' });
        return {
            ...response,
            body: JSON.parse(response.body),
            contentType: 'application/json',
        };
    } catch (error) {
        return {
            status: 500,
            body: {
                message: error,
            },
            contentType: 'application/json',
        };
    }
};

exports.get = handleGet;
