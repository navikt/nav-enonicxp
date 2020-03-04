import { getUrlLookupTableFromFile } from '/lib/menu-utils/url-lookup-table';

const libs = {
    content: require('/lib/xp/content'),
    portal: require('/lib/xp/portal'),
    cache: require('/lib/siteCache'),
    menuUtils: require('/lib/menu-utils'),
};

const handleGet = req =>
    libs.cache.getPaths(req.rawPath, 'decorator-menu', req.branch, () => {
        let urlLookupTable;
        if (app.config.env !== 'p') {
            urlLookupTable = getUrlLookupTableFromFile();
        }

        const menu = libs.menuUtils.getMegaMenu({
            content: libs.content.get({ key: '/www.nav.no/dekorator-meny/' }),
            lookupTable: urlLookupTable,
            levels: 10,
        });

        return { body: menu, contentType: 'application/json' };
    });

exports.get = handleGet;
