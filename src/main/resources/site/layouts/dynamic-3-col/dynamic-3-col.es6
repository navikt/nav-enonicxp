const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
};
const view = resolve('./dynamic-3-col.html');

exports.get = function () {
    return {
        body: libs.thymeleaf.render(view, {}),
        contentType: 'text/html',
    };
};
