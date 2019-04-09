var portal = require('/lib/xp/portal');
var thymeleaf = require('/lib/xp/thymeleaf');
var portal = require('/lib/xp/portal');
var view = resolve('./search.html');
exports.get = function(req) {
    // Return the result
    return {
        body: thymeleaf.render(view, portal.getComponent()),
        contentType: 'text/html',
        pageContributions: {
            headEnd: [
                '<link rel="stylesheet" href="' + portal.assetUrl({ path: 'search-styles/search-appres.css' }) + '" />',
                '<link rel="stylesheet" href="' + portal.assetUrl({ path: 'search-styles/search.css' }) + '" />',
                '<link rel="stylesheet" href="' + portal.assetUrl({ path: 'search-styles/search-nav.css' }) + '" />'
            ],
            bodyEnd: [
                '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>',
                '<script src="' + portal.assetUrl({ path: 'search-js/search-appres.js' }) + '"></script>'
            ]
        }
    };
};
