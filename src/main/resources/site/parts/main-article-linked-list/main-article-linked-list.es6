const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
    navUtils: require('/lib/nav-utils'),
};
// Resolve the view
const view = resolve('main-article-linked-list.html');

function hasMainArticleChapterChildren(content) {
    const children = libs.navUtils.getAllChildren(content);
    const hasChapters =
        children.filter((child) => child.type === app.name + ':main-article-chapter').length > 0;
    return hasChapters;
}

function createList(content) {
    let root;
    if (content.type === app.name + ':main-article' && hasMainArticleChapterChildren(content)) {
        // set content to root if its a main-article with main-article-chapters as children
        root = content;
    } else if (content.type === app.name + ':main-article-chapter') {
        // set parent as root if its a main-article
        const parent = libs.content.get({
            key: content._path.split('/').slice(0, -1).join('/'),
        });
        if (parent.type === app.name + ':main-article') {
            root = parent;
        }
    }

    // we have no linked list
    if (!root) {
        return [];
    }

    // return linked list
    return [
        {
            heading: root.displayName,
            link: libs.portal.pageUrl({
                id: root._id,
            }),
            active: root === content,
        },
    ].concat(
        libs.navUtils
            .getAllChildren(root)
            .filter((child) => child.type === app.name + ':main-article-chapter')
            .map((el) => ({
                heading: el.displayName,
                link: libs.portal.pageUrl({
                    id: el._id,
                }),
                active: el._id === content._id,
            }))
    );
}
exports.get = function (req) {
    return libs.cache.getPaths(req.rawPath, 'main-article-linked-list', req.branch, () => {
        const content = libs.portal.getContent();
        const list = createList(content);
        const langBundle = libs.lang.parseBundle(content.language).main_article.linkedList;
        const model = {
            hasList: list.length > 1,
            list,
            description: langBundle.description,
        };

        return {
            body: libs.thymeleaf.render(view, model),
        };
    });
};
