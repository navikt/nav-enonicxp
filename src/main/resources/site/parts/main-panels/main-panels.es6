const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    cache: require('/lib/siteCache'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('main-panels.html');

function mapElements(el) {
    let ingress = el.data.ingress || el.data.description || el.data.list_description;
    if (ingress && ingress.length > 140) {
        ingress = ingress.substring(0, 140) + '...';
    }

    return {
        isHtml: el.data.ingress ? el.data.ingress.startsWith('<') : false,
        heading: el.displayName || el.data.title,
        icon: 'icon-' + (el.data.icon || 'document'),
        src: libs.navUtils.getSrc(el),
        ingress,
    };
}

function getTableElements(content, contentType) {
    const tableElementIds = libs.navUtils.forceArray(content.data[contentType]);

    let tableElements = libs.content.query({
        start: 0,
        count: tableElementIds.length,
        filters: {
            ids: {
                values: tableElementIds,
            },
        },
    }).hits;

    // make sure the table elements are in the correct order
    tableElements = tableElementIds
        .map((id) => tableElements.filter((el) => el._id === id)[0])
        .filter((el) => !!el);

    return tableElements.map(mapElements);
}

exports.get = (req) => {
    return libs.cache.getPaths(req.rawPath, 'main-panels', req.branch, () => {
        const content = libs.portal.getContent();
        const tableList = getTableElements(content, 'tableContents');
        const table =
            tableList && tableList.length > 0
                ? tableList.slice(0, content.data.nrTableEntries)
                : null;

        const model = {
            table,
        };
        return {
            body: libs.thymeleaf.render(view, model),
        };
    });
};
