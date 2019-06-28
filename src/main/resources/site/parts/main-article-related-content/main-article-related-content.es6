const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    cache: require('/lib/cacheControll'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('main-article-related-content.html');

function handleGet (req) {
    return libs.cache.getPaths(req.path, 'main-article-related-content', req.branch, () => {
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
        const linkList = keys
            .map(el => {
                if (!menuListItems[el]) {
                    return undefined;
                }
                const links = forceArr(menuListItems[el].link);
                return {
                    name: selectNames[el] !== undefined ? selectNames[el] : '',
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
                            } else if (element.type === 'no.nav.navno:Ekstern_lenke') {
                                let url = element.data.url;
                                if (url.indexOf('http') !== 0) {
                                    url = 'https://' + url;
                                }
                                link = url;
                            } else {
                                link = libs.portal.pageUrl({
                                    id: contentId,
                                });
                            }
                            return {
                                title: element.displayName,
                                link: link,
                            };
                        })
                        .filter(el => {
                            if (el) {
                                return true;
                            }
                            return false;
                        }),
                };
            })
            .filter(el => {
                if (el && el.links && el.links.length > 0) {
                    return true;
                }
                return false;
            });

        const hasMenuLists = linkList.length > 0;
        const params = {
            relatedContentList: linkList,
            hasMenuList: hasMenuLists,
        };

        const body = libs.thymeleaf.render(view, params);

        return {
            contentType: 'text/html',
            body: body,
        };
    });
}

exports.get = handleGet;
function forceArr (element) {
    return element !== undefined ? (Array.isArray(element) ? element : [element]) : [];
}
