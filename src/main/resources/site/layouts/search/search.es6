const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
};
const view = resolve('./search.html');

exports.get = function (req) {
    return {
        body: libs.thymeleaf.render(view, libs.portal.getComponent()),
        contentType: 'text/html',
        pageContributions: {
            headEnd: [
                '<link rel="stylesheet" href="' + libs.portal.assetUrl({
                    path: 'search-styles/search.css',
                }) + '" />',
                '<link rel="stylesheet" href="' + libs.portal.assetUrl({
                    path: 'search-styles/search-nav.css',
                }) + '" />',
            ],
            bodyEnd: [
                '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>',
                '<script src="' + libs.portal.assetUrl({
                    path: 'search-js/search-appres.js',
                }) + '"></script>',
            ],
        },
    };
};
