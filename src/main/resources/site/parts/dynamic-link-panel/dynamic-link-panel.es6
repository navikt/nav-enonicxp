const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
    lang: require('/lib/i18nUtil'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('dynamic-link-panel.html');

exports.get = (req) => {
    const model = {};
    return {
        body: libs.thymeleaf.render(view, model),
    };
};
