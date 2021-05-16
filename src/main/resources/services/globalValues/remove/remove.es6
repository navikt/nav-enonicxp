const nodeLib = require('/lib/xp/node');
const { forceArray } = require('/lib/nav-utils');
const { getGlobalValueSet, getGlobalValueUsage } = require('/lib/global-values/global-values');

const invalidRequest = (msg) => ({
    status: 400,
    contentType: 'application/json',
    body: {
        message: `Invalid remove request: ${msg}`,
    },
});

const removeGlobalValueItem = (req) => {
    const { key, contentId } = req.params;

    if (!key || !contentId) {
        return invalidRequest('ContentId and value-key must be provided');
    }

    const content = getGlobalValueSet(contentId);
    if (!content) {
        return invalidRequest(`Global value set with id ${contentId} not found`);
    }

    const valueItems = forceArray(content.data?.valueItems);

    const itemExists = valueItems.some((item) => item.key === key);
    if (!itemExists) {
        return invalidRequest(`Item with key ${key} not found on ${contentId}`);
    }

    const usage = getGlobalValueUsage(key);
    if (usage.length > 0) {
        log.warning(
            `Warning: removing in-use values with key ${key} - uses: ${JSON.stringify(usage)}`
        );
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        repo.modify({
            key: contentId,
            editor: (content) => {
                content.data.valueItems = valueItems.filter((item) => item.key !== key);
                return content;
            },
        });

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                message: `Successfully deleted ${key} on ${contentId}`,
            },
        };
    } catch (e) {
        log.error(`Error deleting ${key} on ${contentId} - ${e}`);
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: `Error deleting ${key} on ${contentId} - ${e}`,
            },
        };
    }
};

module.exports = { removeGlobalValueItem };
