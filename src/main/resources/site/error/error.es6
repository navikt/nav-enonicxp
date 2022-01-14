const thymeleafLib = require('/lib/thymeleaf');

const view = resolve('error.html');

// TODO: implementer error-api i frontend som kan kalles her
exports.handleError = (err) => {
    log.info(JSON.stringify(err));

    const model = {
        status: err.status,
        message: err.message,
    };

    return {
        contentType: 'text/html',
        body: thymeleafLib.render(view, model),
    };
};
