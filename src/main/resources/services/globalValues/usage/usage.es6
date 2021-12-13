const { getGlobalValueUsage } = require('/lib/global-values/global-values');
const { gvServiceInvalidRequestResponse } = require('../utils');

const transformToUsageItem = (content) => ({
    id: content._id,
    path: content._path,
    displayName: content.displayName,
});

const getGlobalValueUsageService = (req) => {
    const { key, contentId } = req.params;

    if (!key || !contentId) {
        return gvServiceInvalidRequestResponse(
            `Missing parameters:${!key && ' "key"'}${!contentId && ' "contentId"'}`
        );
    }

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            usage: transformToUsageItem(getGlobalValueUsage(key, contentId)),
        },
    };
};

module.exports = { getGlobalValueUsageService };
