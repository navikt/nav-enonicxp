const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    utils: require('/lib/nav-utils'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('page-list.html');

exports.get = function (req) {
    return libs.cache.getPaths(req.path, 'page-list', req.branch, () => {
        const content = libs.portal.getContent();
        const langBundle = libs.lang.parseBundle(content.language).page_list;

        let ids = content.data.sectionContents;
        ids = ids ? (!Array.isArray(ids) ? [ids] : ids) : [];
        let items = ids
            .map(value => {
                // map section content ids to content
                return libs.content.get({
                    key: value,
                });
            })
            .filter(el => !!el && el._id !== content._id) // remove itself from list
            .concat(libs.content.getChildren({ // add children as well
                key: content._id,
                start: 0,
                count: 100,
            }).hits)
            .filter(el => el.type !== `${app.name}:content-list` && el.type !== `base:folder`)
            .map(el => {
                // map to model better suited for thymeleaf view
                return {
                    src: libs.portal.pageUrl({
                        id: el._id,
                    }),
                    heading: el.displayName,
                    ingress: el.data.ingress || el.data.description,
                    publishedText: libs.utils.dateTimePublished(el, el.language || 'no'),
                    published: new Date(el.publish && el.publish.first ? el.publish.first : el.createdTime),
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
    });
};
