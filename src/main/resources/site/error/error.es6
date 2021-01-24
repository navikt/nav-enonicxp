exports.handleError = (err) => {
    // TODO: implementer error-api i frontend som kan kalles her
    return {
        contentType: 'text/html',
        body: `<html lang="no"><body><h1>Error code ${err.status}</h1><p>${err.message}</p></body></html>`,
    };
};
