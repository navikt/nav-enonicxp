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

        // nice to know
        const ntkList = getContentLists(content, 'ntkContents', content.data.nrNTK, false);
        const niceToKnow = {
            sectionName: lang.niceToKnow,
            data: (ntkList && ntkList.length > 0
                ? ntkList.slice(0, content.data.nrNTK)
                : null),
        };

        // news
        const newsList = getContentLists(content, 'newsContents', content.data.nrNews, true);
        const news = {
            sectionName: lang.news,
            data: (newsList && newsList.length > 0
                ? newsList.sort((a, b) => b.publDate - a.publDate)
                    .slice(0, content.data.nrNews)
                : null),
        };

        // shortcuts
        const scList = getContentLists(content, 'scContents', content.data.nrSC, false);
        const shortcuts = {
            sectionName: lang.shortcuts,
            data: (scList && scList.length > 0
                ? scList.slice(0, content.data.nrSC)
                : null),
        };

        let antCol = !!niceToKnow.data + !!news.data + !!shortcuts.data;
        if (antCol === 0) { antCol = 1; }
        col += 12 / antCol;

        let localSectionPage = false;
        const pathParts = content._path.split('/');
        if (pathParts[pathParts.length - 2] === 'lokalt') {
            localSectionPage = true;
        }

        const model = {
            table,
            niceToKnow,
            news,
            moreNewsUrl: content.data.moreNewsUrl,
            shortcuts,
            col,
            localSectionPage,
        };
        return {
            body: libs.thymeleaf.render(view, model),
        };
    });
};

function getContentLists (content, contentType, max, doSort) {
    if (content.data[contentType]) {
        const section = libs.content.get({
            key: content.data[contentType],
        });
        if (section) {
            let sectionContentIds = section.data.sectionContents;
            sectionContentIds = sectionContentIds ? Array.isArray(sectionContentIds) ? sectionContentIds : [sectionContentIds] : [];
            let sectionContents = [];
            let sort;
            if (doSort) {
                sort = 'publish.first DESC, createdTime DESC';
            } else {
                sectionContentIds = sectionContentIds.slice(0, max);
            }
            if (sectionContentIds.length > 0) {
                sectionContents = libs.content.query({
                    start: 0,
                    count: max,
                    filters: {
                        ids: {
                            values: sectionContentIds,
                        },
                    },
                    sort,
                }).hits;

                if (!doSort) {
                    // make sure the table elements are in the correct order
                    sectionContents = sectionContentIds.map((id) => {
                        return sectionContents.filter(el => el._id === id)[0];
                    }).filter(el => !!el);
                }
            }

            return sectionContents.map(mapElements);
        }
    }
    return [];
}

function getTableElements (content, contentType) {
    let tableElementIds = content.data[contentType];
    tableElementIds = tableElementIds ? Array.isArray(tableElementIds) ? tableElementIds : [tableElementIds] : [];
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
    tableElements = tableElementIds.map((id) => {
        return tableElements.filter(el => el._id === id)[0];
    }).filter(el => !!el);

    return tableElements.map(mapElements);
}

function mapElements (el) {
    const content = libs.portal.getContent();
    let ingress = el.data.ingress || el.data.description || el.data.list_description;
    if (ingress && ingress.length > 140) {
        ingress = ingress.substring(0, 140) + '...';
    }
    let publishedDate = el.publish && el.publish.first ? el.publish.first : el.createdTime;
    publishedDate = libs.navUtils.fixDateFormat(publishedDate);

    return {
        isHtml: (el.data.ingress ? el.data.ingress.startsWith('<') : false),
        heading: el.displayName || el.data.title,
        icon: 'icon-' + (el.data.icon || 'document'),
        publDate: new Date(publishedDate),
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
    if (el) {
        if (el.type === `${app.name}:internal-link`) {
            return getSrc(libs.content.get({
                key: el.data.target,
            }));
        }
        if (el.type === `${app.name}:external-link`) {
            return el.data.url;
        }
        return libs.portal.pageUrl({
            id: el._id,
        });
    }
    return '/';
}
