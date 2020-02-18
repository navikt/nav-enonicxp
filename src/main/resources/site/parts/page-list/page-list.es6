const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    utils: require('/lib/nav-utils'),
    cache: require('/lib/siteCache'),
};
const view = resolve('page-list.html');

function createModel() {
    const content = libs.portal.getContent();
    const langBundle = libs.lang.parseBundle(content.language).page_list;

    const ids = libs.utils.forceArray(content.data.sectionContents);

    // map section content ids to content
    let items = ids
        .map(value => libs.content.get({ key: value }))
        .filter(el => !!el && el._id !== content._id) // remove itself from list
        .filter(el => el.type !== `${app.name}:content-list` && el.type !== 'base:folder')
        .map((el) => {
            // map to model better suited for thymeleaf view
            const published = el.publish && el.publish.first ? el.publish.first : el.createdTime;
            return {
                src: libs.portal.pageUrl({
                    id: el._id,
                }),
                heading: el.displayName,
                ingress: el.data.ingress || el.data.description,
                publishedText: libs.utils.dateTimePublished(el, el.language || 'no'),
                published: new Date(published.replace(/\.\d+/, '')), // remove milliseconds to get valid date
                type: el.type,
            };
        })
        .reduce((t, el) => { // remove duplicates
            if (t.filter(ele => ele.src === el.src).length === 0) {
                t.push(el);
            }
            return t;
        }, []);

    // order by published
    if (content.data.orderSectionContentsByPublished) {
        items = items.sort((a, b) => b.published - a.published);
    }

    const languages = libs.utils.getLanguageVersions(content);

    const model = {
        published: libs.utils.dateTimePublished(content, content.language || 'no'),
        from: content.publish.from,
        heading: content.data.heading || content.displayName,
        ingress: content.data.ingress,
        items,
        hideDate: !!content.data.hide_date,
        hideSectionContentsDate: !!content.data.hideSectionContentsDate,
        hasLanguageVersions: languages.length > 0,
        languages,
        langBundle,
    };

    return {
        body: libs.thymeleaf.render(view, model),
    };
}
exports.get = function (req) {
    return libs.cache.getPaths(req.rawPath, 'page-list', req.branch, createModel);
};
