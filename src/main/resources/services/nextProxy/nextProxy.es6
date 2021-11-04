const handleGet = (req) => {
    const { path } = req;
    const url = `${nextApiUrl}?path=${path}`;
    log.info(`Requesting frontend asset from: ${url}`);

    return {
        status: 201,
    };
};

exports.get = handleGet;
