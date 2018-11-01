

var libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/xp/thymeleaf'),
    cache: require('/lib/cacheControll')
};
var view = resolve('main-page.html');

function handleGet(req) {
   // log.info(JSON.stringify(req, null, 4))
    var content = libs.portal.getContent();

    //Finn eventuell seksjonsside jeg tilhører (path: /site/språk/seksjonsside/...)
    //TODO: avklare komavdelingens krav til  GTM
    //TODO: Denne må bli smartere
    var path = content._path.split('/');
    var level3 = (path[3] ? path[3] : "").toLowerCase();
    return libs.cache.getDecorator('main-page' + level3, function () {
        var seksjonsSider = "";
        switch ( level3 ) {
            case "person":
            case "bedrift":
            case "nav-og-samfunn":
                seksjonsSider = level3;
                break;
            default:
        }

        var mainRegion = content.page.regions.main;
        var footer = content.page.regions.footer;
        var model = {
            title: content.displayName + ' - www.nav.no',
            mainRegion: mainRegion,
            footerRegion: footer
        };
        var assets = [
            '<link rel="stylesheet" href="' + libs.portal.assetUrl({ path: 'styles/css/navno.css' }) + '" />',
            '<script src="' + libs.portal.assetUrl({path: 'libs/modernizr.2.7.1.min.js'}) + '"></script>',
            '<script src="' + libs.portal.assetUrl({path: 'js/innloggingslinjen.min.js'}) + '"></script>',
            '<script id="navno-page-js" src="' + libs.portal.assetUrl({path: 'js/navno-page.js'}) + '" seksjonssider="' + seksjonsSider + '"></script>',
            '<script async src="' + libs.portal.assetUrl({path: 'js/navno.min.js'}) + '"></script>'
        ];
        var body = libs.thymeleaf.render(view, model);

        return {
            contentType: 'text/html',
            body: body,
            pageContributions: {
                headEnd: assets
            }
        }
    })

}

exports.get = handleGet;