const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('link-panels.html');

exports.get = (req) => {
    return libs.cache.getPaths(req.rawPath, 'link-panels', req.branch, () => {
        const content = libs.portal.getContent();
        const items = libs.navUtils.forceArray(content.data.items);
        const model = {
            heading: content.displayName,
            ingress: content.data.ingress,
            items: items.map((value) => ({
                title: value.title,
                ingress: value.ingress,
                url: libs.navUtils.getUrl(value.url),
                logo: value.logo
                    ? libs.portal.attachmentUrl({
                          id: value.logo,
                      })
                    : null,
                className: value.spanning ? 'heldekkende' : '',
            })),
        };

        return {
            body: libs.thymeleaf.render(view, model),
        };
    });
};
