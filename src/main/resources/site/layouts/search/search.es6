const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('./search.html');

exports.get = function (req) {
    const component = libs.portal.getComponent();
    const language = libs.portal.getContent().language || 'no';
    const toTop = libs.lang.parseBundle(language).pagenav.toTheTop;
    const model = {
        searchbar: component.regions.searchbar,
        result: component.regions.result,
        toTop,
    };

    return {
        body: libs.thymeleaf.render(view, model),
        contentType: 'text/html',
        pageContributions: {
            headEnd: [
                '<link rel="stylesheet" href="' +
                    libs.portal.assetUrl({
                        path: 'search-styles/search-nav.css',
                    }) +
                    '" />',
            ],
            bodyEnd: [
                '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>',
                '<script src="' +
                    libs.portal.assetUrl({
                        path: 'search-js/search-appres.js',
                    }) +
                    '"></script>',
            ],
        },
    };
};
