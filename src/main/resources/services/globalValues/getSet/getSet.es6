const { getGlobalValueSet } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');

const getGlobalValueSetService = (req) => {
    const { contentId } = req.params;

    const content = getGlobalValueSet(contentId);
    if (!content) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: `Global value set with id ${contentId} not found`,
            },
        };
    }

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            items: forceArray(content.data?.valueItems),
        },
    };
};

module.exports = { getGlobalValueSetService };
