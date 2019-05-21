exports.get = handleGet;

function handleGet (req) {
    var params = req.params;
    log.info(JSON.stringify(params));

    var body = null;
    return {
        contentType: 'application/json',
        body: body,
    };
}
