const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('./main-1-col.html');

exports.get = function () {
    const content = libs.portal.getContent();
    const component = libs.portal.getComponent();
    const language = content.language || 'no';
    const toTop = libs.lang.parseBundle(language).pagenav.toTheTop;

    let title = content.displayName;

    // skip title for 404, because it has its own h1
    if (content.type === `${app.name}:404`) {
        title = null;
    }

    const model = {
        firstRegion: component.regions.first,
        title,
        toTop,
    };

    return {
        body: libs.thymeleaf.render(view, model),
        contentType: 'text/html',
    };
};
