const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/cacheControll'),
};
const etag = libs.cache.etag;
const view = resolve('main-page.html');

function handleGet (req) {
    const content = libs.portal.getContent();

    log.info(JSON.stringify(req,null,4));
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
    let url = req.url;
    if (url.indexOf('localhost') === -1 && url.indexOf('https://') === -1) {
        url = url.replace('http', 'https');
    }
    const title = content.displayName;
    const description = content.data.metaDescription || '';
    const imageUrl = libs.portal.assetUrl({ path: 'img/navno/social-share-fallback.png' });
    const regions = content.page.regions;
    const model = {
        mainRegion: regions.main,
        footerRegion: regions.footer,
    };
    const metaData = [
        '<meta charset="utf-8" />',
        '<title>' + title + '</title>',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        '<meta name="apple-mobile-web-app-capable" content="yes" />',
        '<meta name="description" content="' + description + '" />',
        '<meta property="og:title" content="' + title + '" />',
        '<meta property="og:site_name" content="NAV" />',
        '<meta property="og:url" content="' + url + '" />',
        '<meta property="og:description" content="' + description + '" />',
        '<meta property="og:image" content="' + imageUrl + '" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        '<meta name="twitter:domain" content="nav.no" />',
        '<meta name="twitter:title" content="' + title + '" />',
        '<meta name="twitter:description" content="' + description + '" />',
        '<meta name="twitter:image:src" content="' + imageUrl + '" />'
    ];
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
        '<style>.async-hide{opacity:0!important}</style><script src="' + libs.portal.assetUrl({
            path: '/js/optimize.js',
        }) + '"></script>',
        '<script src="' + libs.portal.assetUrl({
            path: 'libs/modernizr.2.7.1.min.js',
        }) + '"></script>',
        '<script src="' + libs.portal.assetUrl({
            path: 'js/innloggingslinjen.min.js',
        }) + '"></script>',
        '<script id="navno-props" src="' + libs.portal.assetUrl({
            path: 'js/navno-page.js',
        }) + '" seksjonssider="' + seksjonsSider +
        '" authServiceUrl="' + (app.config.authServiceUrl ? app.config.authServiceUrl : 'https://www.nav.no/innloggingslinje-api/auth') +
        '"></script>',
        '<script async src="' + libs.portal.assetUrl({
            path: 'js/navno.js',
        }) + '"></script>', // TODO: Lage ny navno.min.js og bruke den
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
            headBegin: metaData,
            headEnd: assets,
        },
    };
}

exports.get = handleGet;
