const portalLib = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');

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
        ord: ord && encodeURI(ord.slice(0, 200)),
        uf: Array.isArray(uf) ? JSON.stringify(uf) : uf,
    };

    log.info(JSON.stringify(params));

    const response = httpClient.request({ url: serviceUrl, params: params, method: 'GET' });

    return response
        ? {
              status: 200,
              body: {
                  serviceUrl: serviceUrl,
                  response: response,
              },
              contentType: 'application/json',
          }
        : {
              status: 500,
              body: {
                  message: 'Search service malfunctioning',
              },
              contentType: 'application/json',
          };
};

exports.get = handleGet;
