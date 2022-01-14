const thymeleafLib = require('/lib/thymeleaf');

const view = resolve('error.html');

// TODO: implementer error-api i frontend som kan kalles her
exports.handleError = (req) => {
    const model = {
        status: req.status,
        message: req.message,
    };

    return {
        contentType: 'text/html',
        body: thymeleafLib.render(view, model),
    };
};
