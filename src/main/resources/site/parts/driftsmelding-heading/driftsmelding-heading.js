var libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
var view = resolve('driftsmelding-heading.html');

function handleGet(req) {
    //Må kjøre i context av master-branch, ellers vil preview i Content studio alltid vise en driftsmelding
    return libs.cache.getPaths('driftsmelding-heading', undefined, function () {
        return libs.context.run(
            {
                repository: 'com.enonic.cms.default',
                branch: 'master',
                user: {
                    login: 'su',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                //Henter ut eventuell publisert driftsmelding. Hvis flere er publisert, hentes sist publiserte
                var message = libs.content.getChildren({
                    key: '/www.nav.no/no/driftsmeldinger',
                    start: 0,
                    count: 1,
                    sort: 'publish.from DESC'
                });
                if ( message && message.hits.length > 0 ) {
                    var content = libs.portal.getContent();
                    var language = content.language || 'no';
                    //Henter ut visningsnavnet og urlen til meldingen, lenketeksten er fast
                    var model = {
                        heading: message.hits[0].displayName,
                        linkurl: libs.portal.pageUrl({type: "absolute", path: message.hits[0]._path}).replace("http:", "https:"),
                        //TODO: fjerne hardkoding av HTTPS når dette er løst i serveroppsettet
                        linktext: libs.lang.parseBundle(language).message.linktext
                    };

                    return {
                        contentType: 'text/html',
                        body: libs.thymeleaf.render(view, model)
                    };
                }
                else {
                    //Ingen publiserte driftsmeldinger
                    return null;
                }
            }
        );
    });
}

exports.get = handleGet;