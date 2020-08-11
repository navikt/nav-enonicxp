const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    cache: require('/lib/siteCache'),
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

        // breaking_news
        const breakingNews = {};
        const breakingNewsContent =
            !localSectionPage && content.data.breaking_news
                ? libs.content.get({
                      key: content.data.breaking_news,
                  })
                : null;

        if (breakingNewsContent && breakingNewsContent.data) {
            // Sett tittel, ingress, og oppdateringstidspunkt
            const breakingNewsTarget = libs.content.get({
                key: breakingNewsContent.data.target,
            });
            if (breakingNewsTarget) {
                breakingNews.title =
                    breakingNewsContent.data.title || breakingNewsTarget.displayName;
                breakingNews.ingress =
                    breakingNewsContent.data.description ||
                    (breakingNewsTarget.data ? breakingNewsTarget.data.ingress : '');

                const updated = breakingNewsContent.data.timestamp;
                if (updated) {
                    breakingNews.updated = `Oppdatert: ${libs.navUtils.formatDateTime(
                        updated,
                        content.language
                    )}`;
                }
                breakingNews.url = libs.navUtils.getSrc(breakingNewsContent);
            }
        }

        const model = {
            breakingNews: Object.keys(breakingNews).length > 0 ? breakingNews : false,
            localSectionPage,
        };
        return {
            body: libs.thymeleaf.render(view, model),
        };
    });
};
