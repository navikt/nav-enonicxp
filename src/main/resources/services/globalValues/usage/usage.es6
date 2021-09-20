const {
    getGlobalValueUsage,
    getGlobalValueUsageLegacy,
} = require('/lib/global-values/global-values');

const getGlobalValueUsageService = (req) => {
    const { key, contentId } = req.params;

    if (!key || !contentId) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: `Missing parameters:${!key && ' "key"'}${!contentId && ' "contentId"'}`,
            },
        };
    }

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            usage: getGlobalValueUsage(key, contentId),
            legacyUsage: getGlobalValueUsageLegacy(key),
        },
    };
};

module.exports = { getGlobalValueUsageService };
