const env = app.config.env;
const libs = {
    http: require('/lib/http-client'),
    portal: require('/lib/xp/portal'),
    io: require('/lib/xp/io'),
};

/*
    URL lookup table for Q1 and Q6 { key : value }
 */

let lookUpTable = {};
const getTableFromFile = () => {
    try {
        log.info(`Opening url-lookup-table from nav-enonicxp-iac`);
        const urlLookupFile = libs.io.getResource('/assets/iac/url-lookup-table.json');
        const urlLookupStream = urlLookupFile.getStream();
        const urlLookupJson = libs.io.readText(urlLookupStream);
        lookUpTable = JSON.parse(urlLookupJson);
    } catch (error) {
        log.error(`Unable to open and parse url-lookup-table: ${error}`);
    }
};

const getTableFromApi = () => {
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
        lookUpTable = JSON.parse(req.body);
    } catch (error) {
        log.error(`Unable to fetch and parse url-lookup-table: ${error}`);
    }
};

const getUrlFromTable = path => {
    let match;

    Object.keys(lookUpTable).some(key => {
        if (path.startsWith(key)) {
            match = key;
            return true;
        }
        return false;
    });
    return match ? path.replace(match, lookUpTable[match]) : path;
};

const getUrlOrPage = (url, pageId) => {
    if (url) {
        return env === 'p' ? url : getUrlFromTable(url);
    }
    return libs.portal.pageUrl({
        id: pageId,
    });
};

module.exports = {
    getTableFromApi,
    getTableFromFile,
    getUrlFromTable,
    getUrlOrPage,
};
