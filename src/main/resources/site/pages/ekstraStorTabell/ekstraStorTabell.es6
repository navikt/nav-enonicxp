const libs = {
    portal: require('/lib/xp/portal'),
    parsers: require('/lib/tableFunctions/tableFunctions'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/cacheControll'),
};
const etag = libs.cache.etag;
const view = resolve('ekstraStorTabell.html');

exports.get = function (req) {
    return libs.cache.getPaths(req.path, 'ekstraStorTabell', () => {
        const content = libs.portal.getContent();
        let parsed;
        if (content.data.article && content.data.article.text) {
            parsed = libs.parsers.map(libs.parsers.parse(content.data.article.text), true);
        }
        const assets = [
            '<link rel="apple-touch-icon" href="' + libs.portal.assetUrl({
                path: 'img/navno/logo.png',
            }) + '" />',
            '<link rel="shortcut icon" type="image/x-icon" href="' + libs.portal.assetUrl({
                path: 'img/navno/favicon.ico',
            }) + '" />',
            '<link rel="stylesheet" href="' + libs.portal.assetUrl({
                path: 'styles/ekstraStorTabell/main.css',
            }) + '" />',
            '<link rel="stylesheet" href="' + libs.portal.assetUrl({
                path: 'styles/ekstraStorTabell/content.css',
            }) + '" />',
            '<link rel="stylesheet" media="print" href="' + libs.portal.assetUrl({
                path: 'styles/ekstraStorTabell/print.css',
            }) + '" />',
        ];
        const model = {
            title: content.displayName + ' - www.nav.no',
            content: parsed,
            referer: req.headers.Referer,
            icons: {
                nav: libs.portal.assetUrl({
                    path: 'img/navno/logo.svg',
                }),
            },
        };
        const body = libs.thymeleaf.render(view, model);

        return {
            contentType: 'text/html',
            body,
            headers: {
                'Cache-Control': 'must-revalidate',
                'ETag': etag(),
            },
            pageContributions: {
                headEnd: assets,
            },
        };
    });
};
