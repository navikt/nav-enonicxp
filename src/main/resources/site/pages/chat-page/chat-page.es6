const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const etag = libs.cache.etag;
const view = resolve('chat-page.html');

function handleGet (req) {
    const content = libs.portal.getContent();
    const language = content.language || 'no';
    const langBundles = libs.lang.parseBundle(language).pagenav;
    const assets = [
        '<link rel="apple-touch-icon" href="' + libs.portal.assetUrl({ path: 'img/navno/logo.png' }) + '" />',
        '<link rel="shortcut icon" type="image/x-icon" href="' + libs.portal.assetUrl({ path: 'img/navno/favicon.ico' }) + '" />',
        '<link rel="stylesheet" href="https://chat.puzzel.com/Content/Client/css/intelecom-light.css" />',
        '<link rel="stylesheet" href="' + libs.portal.assetUrl({ path: 'styles/navno.css' }) + '" />',
        '<link rel="stylesheet" href="' + libs.portal.assetUrl({ path: 'styles/chat-puzzel.css' }) + '" />',
        '<script id="navno-props" src="' + libs.portal.assetUrl({ path: 'js/navno-page.js' }) +
        '" authServiceUrl="https://www.nav.no/innloggingslinje-api/auth"></script>',
        '<script src="https://chat.puzzel.com/Content/Client/js/jquery-latest.min.js"></script>',
        '<script src="https://chat.puzzel.com/Content/Client/js/jquery-intelecomchat.libs.latest.min.js"></script>',
        '<script src="https://chat.puzzel.com/Content/Client/js/jquery-intelecomchat.latest.min.js"></script>',
    ];
    const scripts = [
        '<script id="chatProps" ' +
        'customerKey="' + content.data.customerKey + '" queueKey="' + content.data.queueKey + '" timeId="' + content.data.timeId +
        '" src="' + libs.portal.assetUrl({ path: 'js/chat-puzzel.js' }) + '"></script>',
    ];
    const model = {
        title: content.displayName + ' - www.nav.no',
        heading: content.displayName,
        ingress: content.data.ingress,
        iconUrl: libs.portal.assetUrl({ path: 'img/navno/logo.svg' }),
        homeUrl: libs.portal.pageUrl({ path: '/www.nav.no/' }),
        langBundles,
    };
    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model),
        headers: {
            'Cache-Control': 'must-revalidate',
            'ETag': etag(),
        },
        pageContributions: {
            headEnd: assets,
            bodyEnd: scripts,
        },
    };
}

exports.get = handleGet;
