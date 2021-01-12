exports.get = () => {
    return {
        status: 500,
        body: '<div>Internal routing error</div>',
        contentType: 'text/html',
    };
};
