const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
    utils: require('/lib/nav-utils'),
};
const etag = libs.cache.etag;
const view = resolve('main-page.html');
const decUrl = app.config.decoratorUrl;

function handleGet(req) {
    return libs.cache.getPaths(req.rawPath, 'main-page', req.branch, () => {
        const content = libs.portal.getContent();
        const url = libs.utils.validateUrl(req);
        const title = content.displayName;

        let ingress = content.data.ingress;
        if (!content.data.metaDescription && ingress && ingress.length > 140) {
            ingress = ingress.substring(0, 140);
            ingress = `${ingress.substring(0, ingress.lastIndexOf(' '))}...`;
        }
        const description = content.data.metaDescription || ingress || '';
        const imageUrl = libs.portal.assetUrl({
            path: 'img/navno/social-share-fallback.png',
            type: 'absolute',
        });
        const canonicalUrl = content.data.canonicalUrl || url;
        const header = [
            '<meta charset="utf-8" />',
            `<title>${title}</title>`,
            '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
            '<meta name="apple-mobile-web-app-capable" content="yes" />',
            `<link rel="canonical" href="${canonicalUrl}" />`,
            description ? `<meta name="description" content="${description}" />` : '',
            `<meta property="og:title" content="${title}" />`,
            '<meta property="og:site_name" content="NAV" />',
            `<meta property="og:url" content="${url}" />`,
            description ? `<meta property="og:description" content="${description}" />` : '',
            `<meta property="og:image" content="${imageUrl}" />`,
            '<meta name="twitter:card" content="summary_large_image" />',
            '<meta name="twitter:domain" content="nav.no" />',
            `<meta name="twitter:title" content="${title}" />`,
            description ? `<meta name="twitter:description" content="${description}" />` : '',
            `<meta name="twitter:image:src" content="${imageUrl}" />`,
            `<link href="${decUrl}/css/client.css" rel="stylesheet" />`,
            `<link href="${libs.portal.assetUrl({
                path: 'styles/navno.css',
            })}" rel="stylesheet" />`,
            `<section id="decorator-styles"></section>`,
            `<script src="${decUrl}/client.js"></script>`,
            '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>',
            `<script src="${libs.portal.assetUrl({ path: 'js/navno.js' })}"></script>`,
        ];
        const footer = [`<div id="decorator-env" data-src="${decUrl}/env"></div>`];
        const decoratorClass = content._path.indexOf('/no/') !== -1 ? 'with-context' : '';
        const regions = content.page.regions;
        const model = {
            decoratorClass,
            mainRegion: regions.main,
            footerRegion: regions.footer,
            language: content.language || 'no',
        };
        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
            headers: {
                'Cache-Control': 'must-revalidate',
                ETag: etag(),
            },
            pageContributions: {
                headBegin: header,
                bodyEnd: footer,
            },
        };
    });
}

exports.get = handleGet;
