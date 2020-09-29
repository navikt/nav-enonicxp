const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
};
const view = resolve('page-heading.html');

exports.get = (req) => {
    return libs.cache.getPaths(req.rawPath, 'page-heading', req.branch, () => {
        const content = libs.portal.getContent();
        const ingress =
            content.type !== `${app.name}:section-page` &&
            content.data.ingress &&
            content.data.ingress !== ''
                ? content.data.ingress
                : false;
        const model = {
            heading: content.displayName,
            ingress,
        };

        return {
            body: libs.thymeleaf.render(view, model),
        };
    });
};
