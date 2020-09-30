const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
    menu: require('/lib/menu-utils'),
    utils: require('/lib/nav-utils'),
};
const etag = libs.cache.etag;
const view = resolve('main-page.html');
const decUrl = app.config.decoratorUrl;

function handleGet(req) {
    return libs.cache.getPaths(req.rawPath, 'main-page', req.branch, () => {
        const { utils } = libs;
        const content = libs.portal.getContent();
        const title = content.displayName;
        const languages = utils.getLanguageVersions(content);
        const breadcrumbs = libs.menu.getBreadcrumbMenu({
            linkActiveItem: true,
            showHomepage: false,
        });

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
        const noindex =
            content.type === `${app.name}:searchresult` ||
            content._path.indexOf('/noindex') !== -1 ||
            content.data.noindex;
        const url = utils.validateUrl(req);
        const canonicalUrl = content.data.canonicalUrl || url;
        const header = [
            '<meta charset="utf-8" />',
            `<title>${title}</title>`,
            '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
            '<meta name="apple-mobile-web-app-capable" content="yes" />',
            noindex
                ? '<meta name="robots" content="noindex" />'
                : `<link rel="canonical" href="${canonicalUrl}" />`,
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
            `<script src="${decUrl}/client.js"></script>`,
            '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>',
            '<script src="https://amplitude.nav.no/libs/amplitude-7.1.0-min.gz.js"></script>',
            `<script src="${libs.portal.assetUrl({ path: 'js/navno.js' })}"></script>`,
        ];

        let context = null;
        if (content._path.indexOf('/no/person') !== -1) {
            context = 'privatperson';
        } else if (content._path.indexOf('/no/bedrift') !== -1) {
            context = 'arbeidsgiver';
        } else if (content._path.indexOf('/no/samarbeidspartner') !== -1) {
            context = 'samarbeidspartner';
        }

        const decParams = [
            { key: 'language', value: utils.mapDecoratorLocale[content.language] || 'nb' },
        ];
        if (context) {
            decParams.push({ key: 'context', value: context });
        }
        if (breadcrumbs.length) {
            const encodedBreadcrumbs = encodeURI(JSON.stringify(breadcrumbs));
            decParams.push({ key: 'breadcrumbs', value: encodedBreadcrumbs });
        }
        if (languages.length) {
            const encodedLanguages = encodeURI(JSON.stringify(languages));
            decParams.push({ key: 'availableLanguages', value: encodedLanguages });
        }

        const decEnv = decParams.map((p, i) => `${!i ? `?` : ``}${p.key}=${p.value}`).join('&');
        const footer = [`<div id="decorator-env" data-src="${decUrl}/env${decEnv}"></div>`];
        const decoratorClass = content._path.indexOf('/no/') !== -1 ? 'with-context' : '';
        const regions = content.page.regions;
        const model = {
            decoratorClass,
            mainRegion: regions.main,
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
