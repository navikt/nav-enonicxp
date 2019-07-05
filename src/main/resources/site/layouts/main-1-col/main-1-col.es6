const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('./main-1-col.html');

exports.get = function (req) {
    const content = libs.portal.getContent();
    const component = libs.portal.getComponent();
    const language = content.language || 'no';
    const toTop = libs.lang.parseBundle(language).pagenav.toTheTop;

    const model = {
        title: content.displayName,
        firstRegion: component.regions['first'],
        toTop,
    };

    return {
        body: libs.thymeleaf.render(view, model),
        contentType: 'text/html',
    };
};
