const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('page-footer.html');

function handleGet (req) {
    const content = libs.portal.getContent();
    const language = content.language || 'no';

    return libs.cache.getDecorator('footer-' + language, undefined, req.branch, () => {
        const languageBundles = libs.lang.parseBundle(language).pagenav;
        const contentAZUrl = libs.portal.serviceUrl({service: 'contentAZ'});
        const accessibleLetters = 'abcdefghijklmnopqrstuvwxyz' + (language === 'no' || language === 'se' ? 'æøå' : '');
        const urls = {
            contactUs: libs.portal.pageUrl({
                path: '/www.nav.no/footer-contactus-' + language,
            }),
            accessibility: language !== 'en' ? libs.portal.pageUrl({
                path: '/www.nav.no/footer-accessibility-no',
            }) : undefined,
            privacy: language !== 'en' ? libs.portal.pageUrl({
                path: '/www.nav.no/personvern',
            }) : undefined,
            rss: language !== 'en' ? libs.portal.pageUrl({
                path: '/www.nav.no/no/rss',
            }) : undefined,
        };
        const dato = new Date();
        var model = {
            contentAZUrl,
            accessibleLetters: accessibleLetters.split(''),
            lang: languageBundles,
            urls,
            year: dato.getUTCFullYear().toString(),
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    });
}

exports.get = handleGet;
