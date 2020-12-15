const libs = {
    portal: require('/lib/xp/portal'),
    parsers: require('/lib/tableFunctions/tableFunctions'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
};

const etag = libs.cache.etag;
const view = resolve('page-large-table-legacy.html');

function pageLargeTableLegacy(req) {
    return libs.cache.getPaths(req.rawPath, 'page-large-table', req.branch, () => {
        const content = libs.portal.getContent();
        let parsed;
        if (content.data.text) {
            parsed = libs.parsers.map(libs.parsers.parse(content.data.text), true);
        }
        const assets = [
            '<link rel="apple-touch-icon" href="' +
                libs.portal.assetUrl({
                    path: 'img/navno/logo.png',
                }) +
                '" />',
            '<link rel="shortcut icon" type="image/x-icon" href="' +
                libs.portal.assetUrl({
                    path: 'img/navno/favicon.ico',
                }) +
                '" />',
            '<link rel="stylesheet" href="' +
                libs.portal.assetUrl({
                    path: 'styles/largeTable/main.css',
                }) +
                '" />',
            '<link rel="stylesheet" href="' +
                libs.portal.assetUrl({
                    path: 'styles/largeTable/content.css',
                }) +
                '" />',
            '<link rel="stylesheet" media="print" href="' +
                libs.portal.assetUrl({
                    path: 'styles/largeTable/print.css',
                }) +
                '" />',
        ];
        const model = {
            title: content.displayName + ' - www.nav.no',
            content: parsed,
            icons: {
                nav: libs.portal.assetUrl({
                    path: 'img/navno/logo.svg',
                }),
            },
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
            headers: {
                'Cache-Control': 'must-revalidate',
                ETag: etag(),
            },
            pageContributions: {
                headEnd: assets,
            },
        };
    });
}

module.exports = pageLargeTableLegacy;
