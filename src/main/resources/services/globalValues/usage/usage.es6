const { getGlobalValueUsage } = require('/lib/global-values/global-values');

const getGlobalValueUsageService = (req) => {
    const { key } = req.params;

    if (!key) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: "Missing parameter 'key'",
            },
        };
    }

    const usage = getGlobalValueUsage(key);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            usage,
        },
    };
};

module.exports = { getGlobalValueUsageService };
