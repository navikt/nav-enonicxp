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

        // Sentralt eller lokalt innhold?
        let localSectionPage = false;
        const pathParts = content._path.split('/');
        if (pathParts[pathParts.length - 2] === 'lokalt') {
            localSectionPage = true;
        }

        if (!localSectionPage) {
            const breakingNewsContent = libs.navUtils.forceArray(content.data.breaking_news);
            if (breakingNewsContent.length > 0) {
                let contentLen = 0;
                const breakingNews = breakingNewsContent.map((item) => {
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
                            contentLen++;
                            return {
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
                            };
                        }
                    }
                    return null;
                });
                const langBundle = libs.lang.parseBundle(content.language).breaking_news;
                const label = (langBundle && langBundle.label) || '';
                const model = {
                    breakingNews: contentLen > 0 ? breakingNews : false,
                    label,
                    containerClass: contentLen === 1 ? 'one-col' : '',
                    elementClass: contentLen === 1 ? 'heldekkende' : ''
                };
                return {
                    body: libs.thymeleaf.render(view, model),
                };
            }
        }
        return {
            body: null,
        };
    });
};
