const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('link-lists.html');

function mapElements(el) {
    const content = libs.portal.getContent();
    let publishedDate = el.publish && el.publish.first ? el.publish.first : el.createdTime;
    publishedDate = libs.navUtils.fixDateFormat(publishedDate);

    return {
        heading: el.displayName || el.data.title,
        publDate: new Date(publishedDate),
        src: libs.navUtils.getSrc(el),
        published:
            el.publish &&
            (el.publish.first
                ? libs.navUtils.formatDate(el.publish.first, content.language)
                : libs.navUtils.formatDate(el.createdTime, content.language)),
    };
}

function getContentLists(content, contentType, max, doSort) {
    if (content.data[contentType]) {
        const section = libs.content.get({
            key: content.data[contentType],
        });
        if (section) {
            let sectionContentIds = libs.navUtils.forceArray(section.data.sectionContents);
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
                    sectionContents = sectionContentIds
                        .map((id) => sectionContents.find((el) => el._id === id))
                        .filter((el) => !!el);
                }
            }

            return sectionContents.map(mapElements);
        }
    }
    return [];
}

exports.get = (req) => {
    return libs.cache.getPaths(req.rawPath, 'link-lists', req.branch, () => {
        const content = libs.portal.getContent();
        const langBundle = libs.lang.parseBundle(content.language).link_lists;

        // nice to know
        const ntkList = getContentLists(content, 'ntkContents', content.data.nrNTK, false);
        const niceToKnow = {
            sectionName: langBundle.niceToKnow,
            data: ntkList && ntkList.length > 0 ? ntkList.slice(0, content.data.nrNTK) : null,
        };

        // news
        const newsList = getContentLists(content, 'newsContents', 999, false);
        const news = {
            sectionName: langBundle.news,
            data:
                newsList && newsList.length > 0
                    ? newsList.sort((a, b) => b.publDate - a.publDate).slice(0, content.data.nrNews)
                    : null,
        };

        // shortcuts
        const scList = getContentLists(content, 'scContents', content.data.nrSC, false);
        const shortcuts = {
            sectionName: langBundle.shortcuts,
            data: scList && scList.length > 0 ? scList.slice(0, content.data.nrSC) : null,
        };

        if (ntkList.length > 0 || newsList.length > 0 || scList.length > 0) {
            // Sentralt eller lokalt innhold?
            let localSectionPage = false;
            const pathParts = content._path.split('/');
            if (pathParts[pathParts.length - 2] === 'lokalt') {
                localSectionPage = true;
            }
            const label = (langBundle && langBundle.label) || '';
            const model = {
                niceToKnow,
                news,
                moreNewsUrl: content.data.moreNewsUrl,
                shortcuts,
                localSectionPage,
                label,
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
