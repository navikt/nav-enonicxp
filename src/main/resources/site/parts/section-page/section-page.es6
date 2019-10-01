const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('section-page.html');

exports.get = function (req) {
    return libs.cache.getPaths(req.path, 'section-page', req.branch, () => {
        const content = libs.portal.getContent();
        const lang = libs.lang.parseBundle(content.language).oppslagstavle;
        let col = 'col-md-';
        const tableList = getTableElements(content, 'tableContents');
        const table = (tableList && tableList.length > 0
            ? tableList.slice(0, content.data.nrTableEntries)
            : null);
        const ntkList = getContentLists(content, 'ntkContents');
        const niceToKnow = {
            sectionName: lang.niceToKnow,
            data: (ntkList && ntkList.length > 0
                ? ntkList.slice(0, content.data.nrNTK)
                : null),
        };
        const newsList = getContentLists(content, 'newsContents');
        const news = {
            sectionName: lang.news,
            data: (newsList && newsList.length > 0
                ? newsList.reduce(orderByPublished, []).slice(0, content.data.nrNews)
                : null),
        };
        const scList = getContentLists(content, 'scContents');
        const shortcuts = {
            sectionName: lang.shortcuts,
            data: (scList && scList.length > 0
                ? scList.slice(0, content.data.nrSC)
                : null),
        };
        let antCol = !!niceToKnow.data + !!news.data + !!shortcuts.data;
        if (antCol === 0) { antCol = 1; }
        col += 12 / antCol;

        const model = {
            table,
            niceToKnow,
            news,
            shortcuts,
            col,
        };
        return {
            body: libs.thymeleaf.render(view, model),
        };
    });
};

function getContentLists (content, contentType) {
    if (content.data[contentType]) {
        const section = libs.content.get({
            key: content.data[contentType],
        });

        if (section && section.data.sectionContents) {
            if (Array.isArray(section.data.sectionContents)) {
                return section.data.sectionContents.map(mapElements).filter(el => !!el);
            } else {
                return [section.data.sectionContents].map(mapElements).filter(el => !!el);
            }
        }
    }
    return [];
}

function getTableElements (content, contentType) {
    return (content.data[contentType]
        ? (Array.isArray(content.data[contentType]) ? content.data[contentType] : [content.data[contentType]])
        : []).map(mapElements).filter(el => !!el);
}

function mapElements (elementId) {
    const el = libs.content.get({
        key: elementId,
    });
    if (!el) {
        return null;
    }
    const content = libs.portal.getContent();
    let ingress = el.data.ingress || el.data.description || el.data.list_description;
    if (ingress && ingress.length > 140) {
        ingress = ingress.substring(0, 140) + '...';
    }
    return {
        isHtml: (el.data.ingress ? el.data.ingress.startsWith('<') : false),
        heading: el.displayName || el.data.title,
        icon: 'icon-' + (el.data.icon || 'document'),
        src: getSrc(el),
        published: el.publish &&
            (el.publish.first
                ? libs.navUtils.formatDate(el.publish.first, content.language)
                : libs.navUtils.formatDate(el.createdTime, content.language)
            ),
        ingress,
    };
}

function getSrc (el) {
    if (el.data.url) {
        if (el.data.url.indexOf('https://') !== -1 || el.data.url.indexOf('http://') !== -1) {
            return el.data.url;
        }
        return libs.portal.pageUrl({
            path: el.data.url,
        });
    } else {
        return libs.portal.pageUrl({
            id: el._id,
        });
    }
}

function orderByPublished (list, element) {
    for (let i = 0; i < list.length; i += 1) {
        if (element && new Date(list[i].published) < new Date(element.published)) {
            list.splice(i, 0, element);
            return list;
        }
    }
    if (element) {
        list.push(element);
    }
    return list;
}
