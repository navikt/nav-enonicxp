exports.get = handleGet;

function handleGet(req) {
    const params = req.params;
    log.info(JSON.stringify(params));

    const body = null;
    return {
        contentType: 'application/json',
        body: body,
    };
}
