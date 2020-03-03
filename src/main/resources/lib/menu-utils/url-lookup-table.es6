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
        log.info(`Fetching url-lookup.json from nav-enonicxp-iac`);
        const url = `https://raw.githubusercontent.com/navikt/nav-enonicxp-iac/master/url-lookup/${env}.json`;
        const req = libs.http.request({ url, contentType: 'application/json' });
        return JSON.parse(req.body);
    } catch (error) {
        log.error(`Unable to fetch and parse url-lookup.json: ${error}`);
    }
    return {};
};

const getUrlFromLookupTable = (table, path) => {
    return table[path] || path;
};

exports.getUrlLookupTable = getUrlLookupTable;
exports.getUrlFromLookupTable = getUrlFromLookupTable;
