const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/cacheControll'),
};
const etag = libs.cache.etag;
const view = resolve('main-page.html');

function handleGet (req) {
    const content = libs.portal.getContent();

    // Finn eventuell seksjonsside jeg tilhører (path: /site/språk/seksjonsside/...)
    // TODO: Denne må bli smartere
    const path = content._path.split('/');
    const level3 = (path[3] ? path[3] : '').toLowerCase();

    let seksjonsSider = '';
    switch (level3) {
    case 'person':
    case 'bedrift':
    case 'nav-og-samfunn':
        seksjonsSider = level3;
        break;
    default:
    }

    const mainRegion = content.page.regions.main;
    const footer = content.page.regions.footer;
    const model = {
        title: content.displayName + ' - www.nav.no',
        mainRegion: mainRegion,
        footerRegion: footer,
    };
    const assets = [
        '<link rel="apple-touch-icon" href="' + libs.portal.assetUrl({
            path: 'img/navno/logo.png',
        }) + '" />',
        '<link rel="shortcut icon" type="image/x-icon" href="' + libs.portal.assetUrl({
            path: 'img/navno/favicon.ico',
        }) + '" />',
        '<link rel="stylesheet" href="' + libs.portal.assetUrl({
            path: 'styles/navno.css',
        }) + '" />',
        '<script src="' + libs.portal.assetUrl({
            path: 'libs/modernizr.2.7.1.min.js',
        }) + '"></script>',
        '<script src="' + libs.portal.assetUrl({
            path: 'js/innloggingslinjen.min.js',
        }) + '"></script>',
        '<script id="navno-page-js" src="' + libs.portal.assetUrl({
            path: 'js/navno-page.js',
        }) + '" seksjonssider="' + seksjonsSider + '"></script>',
        '<script id="google-tag-manager-props" src="' + libs.portal.assetUrl({
            path: 'js/google-tag-manager.js',
        }) + '"></script>',
        '<script async src="' + libs.portal.assetUrl({
            path: 'js/navno.js',
        }) + '"></script>', // TODO: Husk å sette tilbake til navno.min.js
    ];
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
}

exports.get = handleGet;
