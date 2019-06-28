const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('oppslagstavle.html');

exports.get = function (req) {
    return libs.cache.getPaths(req.path, 'oppslagstavle', req.branch, () => {
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
    return el
        ? {
            isHtml: el.data.ingress ? el.data.ingress.startsWith('<') : false,
            heading: el.displayName || el.data.title,
            icon: 'icon-' + (el.data.icon || 'document'),
            ingress: el.data.ingress || el.data.description || el.data.list_description,
            src: getSrc(el),
            published: el.publish && el.publish.first ? el.publish.first : el.createdTime,
        }
        : null;
}

function getSrc (el) {
    if (el.data.url) {
        if (el.data.url.indexOf('https://') !== -1 || el.data.url.indexOf('http://') !== -1) {
            let url = el.data.url.toLowerCase().replace(':443', '');
            if (url.indexOf('https://www.nav.no/') === 0 || url.indexOf('http://www.nav.no/') === 0) {
                // TODO this should't be necessary after migration - link cleanup have been run, but its a quick fix for now
                // log.info('url:  ' + url);
                /* url = decodeURIComponent(url);
                url = url.replace(/\+/g, '-');
                url = url.replace(/,/g, '');
                url = url.replace(/å/g, 'a');
                url = url.replace(/ø/g, 'o');
                url = url.replace(/æ/g, 'ae');
                var path = url.replace('https://', '/').replace('http://', '/');
                // log.info('path: ' + path);
                // log.info('new url: ' + portal.pageUrl({ path: path }));
                return portal.pageUrl({
                    path: path,
                }); */
                log.info('URL-REPLACE');
            }
            return url;
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
