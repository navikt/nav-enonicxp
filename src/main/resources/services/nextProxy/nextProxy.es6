const handleGet = (req) => {
    log.info(`NOT requesting frontend asset from: ${req.path}`);

    return { status: 204 };
};

exports.get = handleGet;
