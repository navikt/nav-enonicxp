const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    cache: require('/lib/siteCache'),
    lang: require('/lib/i18nUtil'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('breaking-news.html');

exports.get = (req) => {
    return libs.cache.getPaths(req.rawPath, 'breaking-news', req.branch, () => {
        const content = libs.portal.getContent();
        let body = null;

        // Sentralt eller lokalt innhold?
        let localSectionPage = false;
        const pathParts = content._path.split('/');
        if (pathParts[pathParts.length - 2] === 'lokalt') {
            localSectionPage = true;
        }

        if (!localSectionPage) {
            const breakingNewsContent = libs.navUtils.forceArray(content.data.breaking_news);
            const breakingNews = breakingNewsContent.reduce((t, item) => {
                const contentObj = libs.content.get({
                    key: item,
                });
                if (contentObj && contentObj.data && contentObj.data.target) {
                    // Sett tittel, ingress, og oppdateringstidspunkt
                    const target = libs.content.get({
                        key: contentObj.data.target,
                    });
                    if (target) {
                        const updated = contentObj.data.timestamp;
                        t.push({
                            title: contentObj.data.title || contentObj.displayName,
                            ingress:
                                contentObj.data.description ||
                                (target.data ? target.data.ingress : ''),
                            updated: updated
                                ? `Oppdatert: ${libs.navUtils.formatDateTime(
                                      updated,
                                      content.language
                                  )}`
                                : null,
                            url: libs.navUtils.getSrc(target),
                        });
                    }
                }
                return t;
            }, []);
            const contentLen = breakingNews.length;
            if (contentLen > 0) {
                const langBundle = libs.lang.parseBundle(content.language).breaking_news;
                const label = (langBundle && langBundle.label) || '';
                const model = {
                    breakingNews,
                    label,
                    containerClass: contentLen === 1 ? 'one-col' : '',
                    elementClass: contentLen === 1 ? 'heldekkende' : '',
                };
                body = libs.thymeleaf.render(view, model);
            }
        }
        return {
            body,
        };
    });
};
