const libs = {
    cache: require('/lib/siteCache'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    navUtils: require('/lib/nav-utils'),
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
};
const view = resolve('menu-list.html');

function handleGet(req) {
    return libs.cache.getPaths(req.rawPath, 'menu-list', req.branch, () => {
        let content = libs.portal.getContent();
        if (content.type === app.name + ':main-article-chapter') {
            content = libs.content.get({
                key: content.data.article,
            });
        }
        const selectNames = libs.lang.parseBundle(content.language).related_content.select;
        const menuListItems = content.data.menuListItems || {};
        const keys = [
            'shortcuts',
            'selfservice',
            'form-and-application',
            'process-times',
            'related-information',
            'international',
            'report-changes',
            'rates',
            'appeal-rights',
            'membership',
            'rules-and-regulations',
        ];
        const menuLists = keys
            .map((el) => {
                if (!menuListItems[el]) {
                    return undefined;
                }
                const links = libs.navUtils
                    .forceArray(menuListItems[el].link)
                    .concat(libs.navUtils.forceArray(menuListItems[el].files));
                return {
                    name: selectNames[el] !== undefined ? selectNames[el] : '',
                    expanded: el === 'shortcuts',
                    links: links
                        .map((contentId) => {
                            const element = libs.content.get({
                                key: contentId,
                            });
                            if (!element) {
                                return undefined;
                            }
                            let link = '';
                            if (element.type.indexOf('media:') !== -1) {
                                link = libs.portal.attachmentUrl({
                                    id: element._id,
                                    download: true,
                                });
                            } else if (element.type === 'no.nav.navno:internal-link') {
                                link = libs.portal.pageUrl({
                                    id: element.data.target,
                                });
                            } else if (element.type === 'no.nav.navno:external-link') {
                                link = element.data.url;
                            } else {
                                link = libs.portal.pageUrl({
                                    id: contentId,
                                });
                            }
                            return {
                                title: element.displayName,
                                link,
                            };
                        })
                        .filter((elem) => !!elem),
                };
            })
            .filter((el) => el && el.links && el.links.length > 0);

        if (menuLists.length > 0) {
            const model = {
                menuLists,
            };
            return {
                contentType: 'text/html',
                body: libs.thymeleaf.render(view, model),
            };
        }
        return {
            contentType: 'text/html',
            body: null,
        };
    });
}

exports.get = handleGet;
