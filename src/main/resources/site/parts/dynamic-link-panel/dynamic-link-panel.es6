const libs = {
    thymeleaf: require('/lib/thymeleaf'),
};
const view = resolve('dynamic-link-panel.html');

exports.get = (req) => {
    const model = {};
    return {
        body: libs.thymeleaf.render(view, model),
    };
};
