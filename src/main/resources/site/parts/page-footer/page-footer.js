var libs = {
    thymeleaf: require('/lib/xp/thymeleaf'),
    portal: require('/lib/xp/portal'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll')
};
var view = resolve('page-footer.html');

function handleGet(req) {
    var site = libs.portal.getSite();
    var content = libs.portal.getContent();
    return libs.cache.getDecorator('footer' + (content.language ? content.language : 'no'), function() {
        var languageBundles = libs.lang.parseBundle(content.language).pagenav;
        var contentAZPage = libs.portal.serviceUrl({service: 'contentAZ'});
        var accessibleLetters = 'abcdefghijklmnopqrstuvwxyz' + (content.language === 'no' ? 'æøå' : '');
        var frontPageUrl = libs.portal.pageUrl({id: site._id});
        var urls = {
            contactUs:      frontPageUrl + '/kontaktoss',
            accessibility:  frontPageUrl + '/tilgjengelighet',
            privacy:        frontPageUrl + '/personvern',
            rss:            frontPageUrl + '/rss'
        };
        var dato = new Date();
        var model = {
            contentAZPage: contentAZPage,
            accessibleLetters: accessibleLetters.split(''),
            lang: languageBundles,
            urls: urls,
            year: dato.getUTCFullYear().toString()
        };

        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model)
        };
    })

}

exports.get = handleGet;