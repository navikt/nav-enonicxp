const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
};
const view = resolve('page-heading.html');

exports.get = (req) => {
    return libs.cache.getPaths(req.rawPath, 'page-heading', req.branch, () => {
        const content = libs.portal.getContent();
        const model = {
            heading: content.displayName,
            ingress: !!content.data.ingress,
        };

        return {
            body: libs.thymeleaf.render(view, model),
        };
    });
};
