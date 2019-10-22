const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    cache: require('/lib/cacheControll'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('menu-list.html');

function handleGet (req) {
    return libs.cache.getPaths(req.path, 'menu-list', req.branch, () => {
        let content = libs.portal.getContent();
        if (content.type === app.name + ':main-article-chapter') {
            content = libs.content.get({
                key: content.data.article,
            });
        }
        const selectNames = libs.lang.parseBundle(content.language).related_content.select;
        const menuListItems = content.data.menuListItems || {
        };
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
            .map(el => {
                if (!menuListItems[el]) {
                    return undefined;
                }
                const links = forceArr(menuListItems[el].link).concat(forceArr(menuListItems[el].files));
                return {
                    name: selectNames[el] !== undefined ? selectNames[el] : '',
                    expanded: el === 'shortcuts',
                    links: links
                        .map(contentId => {
                            const element = libs.content.get({
                                key: contentId,
                            });
                            if (!element) {
                                return undefined;
                            }
                            let link = '';
                            if (element.type === 'media:document') {
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
                        .filter(el => !!el),
                };
            })
            .filter(el => {
                return el && el.links && el.links.length > 0;
            });

        if (menuLists.length > 0) {
            log.info(JSON.stringify(menuLists, null, 4));
            const model = {
                menuLists,
            };
            return {
                contentType: 'text/html',
                body: libs.thymeleaf.render(view, model),
            };
        } else {
            return {
                contentType: 'text/html',
                body: null,
            };
        }
    });
}

exports.get = handleGet;
function forceArr (element) {
    return element !== undefined ? (Array.isArray(element) ? element : [element]) : [];
}
