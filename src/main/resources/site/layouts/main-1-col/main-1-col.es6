const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('./main-1-col.html');

const handleGet = () => {
    const content = libs.portal.getContent();
    const component = libs.portal.getComponent();
    const language = content.language || 'no';
    const toTop = libs.lang.parseBundle(language).pagenav.toTheTop;
    const model = {
        firstRegion: component.regions.first,
        title: content.displayName,
        toTop,
    };

    return {
        body: libs.thymeleaf.render(view, model),
        contentType: 'text/html',
    };
};

exports.get = handleGet;
