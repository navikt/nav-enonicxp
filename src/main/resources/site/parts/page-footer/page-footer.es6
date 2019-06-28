var libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
var view = resolve('page-footer.html');

function handleGet (req) {
    var content = libs.portal.getContent();
    var language = content.language || 'no';

    return libs.cache.getDecorator('footer-' + language, undefined, req.branch, function () {
        var languageBundles = libs.lang.parseBundle(language).pagenav;
        var contentAZPage = libs.portal.serviceUrl({
            service: 'contentAZ',
        });
        var accessibleLetters = 'abcdefghijklmnopqrstuvwxyz' + (language === 'no' || language === 'se' ? 'æøå' : '');
        var urls = {
            contactUs: libs.portal.pageUrl({
                type: 'absolute', path: '/www.nav.no/footer-contactus-' + language,
            }),
            accessibility: language !== 'en' ? libs.portal.pageUrl({
                type: 'absolute', path: '/www.nav.no/footer-accessibility-no',
            }) : undefined,
            privacy: language !== 'en' ? libs.portal.pageUrl({
                type: 'absolute', path: '/www.nav.no/personvern',
            }) : undefined,
            rss: language !== 'en' ? libs.portal.pageUrl({
                type: 'absolute', path: '/www.nav.no/no/rss',
            }) : undefined,
        };
        var dato = new Date();
        var model = {
            contentAZPage: contentAZPage,
            accessibleLetters: accessibleLetters.split(''),
            lang: languageBundles,
            urls: urls,
            year: dato.getUTCFullYear().toString(),
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    });
}

exports.get = handleGet;
