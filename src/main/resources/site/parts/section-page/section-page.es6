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
        const table = getTableElements(content, 'tableContents').slice(0, content.data.nrTableEntries);
        let col = 'col-md-';
        const niceToKnow = {
            sectionName: lang.niceToKnow,
            data: getContentLists(content, 'ntkContents').slice(0, content.data.nrNTK),
        };
        const news = {
            sectionName: lang.news,
            data: getContentLists(content, 'newsContents')
                .reduce(orderByPublished, [])
                .slice(0, content.data.nrNews),
        };
        const shortcuts = {
            sectionName: lang.shortcuts,
            data: getContentLists(content, 'scContents').slice(0, content.data.nrSC),
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
                return section.data.sectionContents.map(mapElements);
            } else {
                return [section.data.sectionContents].map(mapElements);
            }
        }
    }
    return [];
}

function getTableElements (content, contentType) {
    return (content.data[contentType] ? (Array.isArray(content.data[contentType]) ? content.data[contentType] : [content.data[contentType]]) : []).map(
        mapElements
    );
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
        isHtml: el.data.ingress ? el.data.ingress.startsWith('<') : false,
        heading: el.displayName || el.data.title,
        icon: 'icon-' + (el.data.icon || 'document'),
        src: getSrc(el),
        published: el.publish && el.publish.first ? libs.navUtils.formatDate(el.publish.first, content.language) : libs.navUtils.formatDate(el.createdTime, content.language),
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
    for (var i = 0; i < list.length; i += 1) {
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
