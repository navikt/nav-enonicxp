const httpClient = require('/lib/http-client');

const handleGet = () => {
    const response = httpClient.request({
        url: 'http://localhost:8080/no/rss',
        contentType: 'text/xml',
    });

    return (
        response || {
            status: 404,
            body: {
                message: 'Site path not found',
            },
            contentType: 'application/json',
        }
    );
};

exports.get = handleGet;
