const libs = {
    thymeleaf: require('/lib/thymeleaf'),
};
const view = resolve('dynamic-alert.html');

exports.get = (req) => {
    const model = {};
    return {
        body: libs.thymeleaf.render(view, model),
    };
};
