const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
    lang: require('/lib/i18nUtil'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('link-panel-with-background.html');

exports.get = (req) => {
    const model = {
        heading: 'Test heading',
        label: 'Test label',
        items: [],
    };
    return {
        body: libs.thymeleaf.render(view, model),
    };
};
