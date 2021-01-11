const libs = {
    content: require('/lib/xp/content'),
    cache: require('/lib/siteCache'),
};

const searchForRedirect = (path, req) => {
    const isRedirect = path.split('/').length === 3;
    let element = false;
    if (isRedirect) {
        const contentName = path.split('/').pop().toLowerCase();
        const redirects = libs.cache.getRedirects(
            'redirects',
            undefined,
            req.branch,
            () =>
                libs.content.getChildren({
                    key: '/redirects',
                    start: 0,
                    count: 10000,
                }).hits
        );

        for (let i = 0; i < redirects.length; i += 1) {
            const el = redirects[i];
            if (el.displayName.toLowerCase() === contentName) {
                if (
                    el.type === app.name + ':internal-link' ||
                    el.type === app.name + ':external-link'
                ) {
                    element = el;
                    break;
                }
            }
        }
    }
    return element;
};

module.exports = { searchForRedirect };
