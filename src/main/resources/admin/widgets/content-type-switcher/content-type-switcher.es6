const handleGet = (req) => {
    log.info(`req: ${JSON.stringify(req)}`);

    return {
        body: '<html><head></head><body><h1>My first widget</h1></body></html>',
        contentType: 'text/html',
    };
};

exports.get = handleGet;
