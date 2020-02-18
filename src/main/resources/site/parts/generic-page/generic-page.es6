const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
};
const view = resolve('generic-page.html');

function handleGet(req) {
    return libs.cache.getPaths(req.rawPath, 'generic-page', req.branch, () => {
        const content = libs.portal.getContent();
        const langBundle = libs.lang.parseBundle(content.language).main_article;
        const model = {
            heading: content.displayName,
            ingress: content.data.ingress,
            text: content.data.text,
            langBundle,
        };
        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    });
}

exports.get = handleGet;
