const { getSitemapData } = require('/lib/sitemap/sitemap');

const handleGet = (req) => {
    const { secret } = req.headers;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Unauthorized',
            },
            contentType: 'application/json',
        };
    }

    const response = getSitemapData();

    return {
        status: 200,
        body: response,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
