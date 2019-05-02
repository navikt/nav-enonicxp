var libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    log: require('/lib/contentTranslator')
};
var view = resolve('driftsmelding-heading.html');

function handleGet(req) {
    var content = libs.portal.getContent();
    var language = content.language || 'no';
    var linktext = libs.lang.parseBundle(language).driftsmelding.linktext;
    //var message = libs.content.get({key:'/www.nav.no/no/driftsmelding'});
    var model = {
        showheading: true,
        heading: 'Problemer i NAV',
        linkur: 'https://www.nav.no/no/driftsmelding',
        linktext: linktext
    };

    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model)
    };
}

exports.get = handleGet;