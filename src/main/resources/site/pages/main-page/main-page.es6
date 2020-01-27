const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/cacheControll'),
};
const etag = libs.cache.etag;
const view = resolve('main-page.html');

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
            type: 'absolute',
        });
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
        const regions = content.page.regions;
        const model = {
            mainRegion: regions.main,
            footerRegion: regions.footer,
        };
        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
            headers: {
                'Cache-Control': 'must-revalidate',
                'ETag': etag(),
            },
            pageContributions: {
                headBegin: metaData,
            },
        };
    });
}

exports.get = handleGet;
