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
        if (content.data.panelItems) {
            const heading =
                content.data.panelsHeading && content.data.panelsHeading !== ''
                    ? content.data.panelsHeading
                    : false;
            const items = libs.navUtils.forceArray(content.data.panelItems);
            const model = {
                heading,
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
        }
        return {
            body: null,
        };
    });
};
