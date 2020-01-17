const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
};
const view = resolve('transport.html');

exports.get = function (req) {
    return libs.cache.getPaths(req.rawPath, 'transport', req.branch, () => {
        const content = libs.portal.getContent();
        const items = content.data.items ? Array.isArray(content.data.items) ? content.data.items : [content.data.items] : [];
        const model = {
            ingress: content.data.ingress,
            items: items.map(value => {
                return {
                    title: value.title,
                    ingress: value.ingress,
                    url: getUrl(value.url),
                    logo: value.logo ? libs.portal.attachmentUrl({
                        id: value.logo,
                    }) : null,
                    className: value.spanning ? 'heldekkende' : '',
                };
            }),
        };

        return {
            body: libs.thymeleaf.render(view, model),
            pageContributions: {
                headEnd: ['<link rel="stylesheet" href="' + libs.portal.assetUrl({
                    path: 'styles/navno.css',
                }) + '"/>'],
            },
        };
    });
};

function getUrl (url) {
    if (url.text) { return url.text; }
    return libs.portal.pageUrl({
        id: url.ref,
    });
}
