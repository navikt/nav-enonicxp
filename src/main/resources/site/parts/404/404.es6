const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('404.html');

function handleGet(req) {
    const content = libs.portal.getContent();
    const model = {
        title: content.displayName,
        errorMessage: content.data.errorMessage,
    };
    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model),
    };
}

exports.get = handleGet;
