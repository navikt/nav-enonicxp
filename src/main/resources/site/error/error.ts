import thymeleafLib from '/lib/thymeleaf';

const view = resolve('error.html');

// TODO: implementer error-api i frontend som kan kalles her
export const handleError = (req: XP.ErrorRequest) => {
    const model = {
        status: req.status,
        message: req.message,
    };

    return {
        contentType: 'text/html',
        body: thymeleafLib.render(view, model),
    };
};
