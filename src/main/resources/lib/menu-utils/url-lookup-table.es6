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

const getUrlLookupTableFromFile = () => {
    try {
        log.info(`Opening url-lookup-table from nav-enonicxp-iac`);
        const urlLookupFile = libs.io.getResource('/assets/iac/url-lookup-table.json');
        const urlLookupStream = urlLookupFile.getStream();
        const urlLookupJson = libs.io.readText(urlLookupStream);
        return JSON.parse(urlLookupJson);
    } catch (error) {
        log.error(`Unable to open and parse url-lookup-table: ${error}`);
    }
    return {};
};

const getUrlLookupTableFromApi = () => {
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

exports.getUrlLookupTableFromFile = getUrlLookupTableFromFile;
exports.getUrlLookupTableFromApi = getUrlLookupTableFromApi;
exports.getUrlFromLookupTable = getUrlFromLookupTable;

