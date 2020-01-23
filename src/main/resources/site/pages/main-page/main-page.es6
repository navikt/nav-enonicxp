const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/cacheControll'),
};
const etag = libs.cache.etag;
const view = resolve('main-page.html');

const decUrl = "http://localhost:8100/dekoratoren"

function handleGet (req) {
    return libs.cache.getPaths(req.rawPath, 'main-page', req.branch, () => {
        const content = libs.portal.getContent();
        let url = req.url;
        if (url.indexOf('localhost') === -1 && url.indexOf('https://') === -1) {
            url = url.replace('http', 'https');
        }
        const title = content.displayName;
        const description = content.data.metaDescription || '';
        const imageUrl = libs.portal.assetUrl({
            path: 'img/navno/social-share-fallback.png',
        });
        const header = [
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
            '<meta name="twitter:image:src" content="' + imageUrl + '" />',
            '<link href="' + decUrl + '/css/client.css" rel="stylesheet" />',
            '<link rel="stylesheet" href="' + libs.portal.assetUrl({
                path: 'styles/navno.css',
            }) + '" />',
            '<script src="' + decUrl + '/client.js"></script>',
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>',
            '<script src="' + libs.portal.assetUrl({
                path: 'js/navno.js',
            }) + '"></script>',
        ];
        const decoratorEnv = [
            '<div id="decorator-env" data-src="' + decUrl + '/env.json"></div>',
        ];
        const regions = content.page.regions;
        const model = {
            mainRegion: regions.main,
        };
        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
            headers: {
                'Cache-Control': 'must-revalidate',
                'ETag': etag(),
            },
            pageContributions: {
                headBegin: header,
                bodyEnd: decoratorEnv,
            },
        };
    });
}

exports.get = handleGet;
