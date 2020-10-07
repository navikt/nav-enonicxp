const libs = {
    thymeleaf: require('/lib/thymeleaf'),
};
const view = resolve('dynamic-supervisor-panel.html');

exports.get = (req) => {
    const model = {};
    return {
        body: libs.thymeleaf.render(view, model),
    };
};
