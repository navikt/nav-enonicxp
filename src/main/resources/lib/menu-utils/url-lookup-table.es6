const libs = {
    http: require('/lib/http-client'),
    io: require('/lib/xp/io'),
};

/*
    URL lookup table for Q1 and Q6
    {
        "key": "value"
    }
 */

const env = app.config.env;
const getUrlLookupTable = () => {
    try {
        log.info(`Fetching url-lookup-table from nav-enonicxp-iac`);
        const url = `https://raw.githubusercontent.com/navikt/nav-enonicxp-iac/master/url-lookup-tables/${env}.json`;
        const req = libs.http.request({
            url: url,
            contentType: 'application/json',
            ...(env !== 'localhost' && {
                proxy: {
                    host: 'webproxy-internett.nav.no',
                    port: 8088,
                },
            }),
        });
        return JSON.parse(req.body);
    } catch (error) {
        log.error(`Unable to fetch and parse url-lookup-table: ${error}`);
    }
    return {};
};

const getUrlFromLookupTable = (table, path) => {
    return table[path] || path;
};

exports.getUrlLookupTable = getUrlLookupTable;
exports.getUrlFromLookupTable = getUrlFromLookupTable;
