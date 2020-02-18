const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    lang: require('/lib/i18nUtil'),
};
const view = resolve('./main.html');

exports.get = function (req) {
    const component = libs.portal.getComponent();
    const language = libs.portal.getContent().language || 'no';
    const toTop = libs.lang.parseBundle(language).pagenav.toTheTop;

    const model = {
        firstRegion: component.regions['first'],
        secondRegion: component.regions['second'],
        lClass: component.regions['second']
            ? {
                first: 'col-sm-12 col-md-8', second: 'col-sm-12 col-md-4',
            }
            : {
                first: 'col-sm-12', second: '',
            },
        toTop,
    };

    return {
        body: libs.thymeleaf.render(view, model),
        contentType: 'text/html',
    };
};
