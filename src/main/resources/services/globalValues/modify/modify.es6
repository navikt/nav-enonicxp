const nodeLib = require('/lib/xp/node');
const {
    validateGlobalValueInputAndGetErrorResponse,
    gvServiceInvalidRequestResponse,
} = require('../utils');
const { getGlobalValueSet } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { forceArray } = require('/lib/nav-utils');

const itemNameExists = (valueItems, itemName, key) =>
    itemName && valueItems.find((item) => item.itemName === itemName && item.key !== key);

const modifyGlobalValueItemService = (req) => {
    const errorResponse = validateGlobalValueInputAndGetErrorResponse(req.params);
    if (errorResponse) {
        return errorResponse;
    }

    const { contentId, key, itemName, textValue, numberValue } = req.params;

    const content = runInBranchContext(() => getGlobalValueSet(contentId), 'draft');
    if (!content) {
        return gvServiceInvalidRequestResponse(`Global value set with id ${contentId} not found`);
    }

    const valueItems = forceArray(content.data?.valueItems);

    const itemToModify = valueItems.find((item) => item.key === key);
    if (!itemToModify) {
        gvServiceInvalidRequestResponse(`Item with key ${key} not found on ${contentId}`);
    }

    if (itemName && itemNameExists(valueItems, itemName, key)) {
        gvServiceInvalidRequestResponse(`Item name ${itemName} already exists on ${contentId}`);
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        const modifiedItem = {
            key,
            itemName,
            ...(textValue && { textValue }),
            ...(numberValue !== undefined && { numberValue }),
        };

        repo.modify({
            key: contentId,
            editor: (_content) => {
                _content.data.valueItems = valueItems.map((item) =>
                    item.key === key ? modifiedItem : item
                );

                return _content;
            },
        });

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                message: `Successfully modified ${key} on ${contentId}`,
                level: 'info',
            },
        };
    } catch (e) {
        log.error(`Error modifying ${key} on ${contentId} - ${e}`);
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: `Error modifying ${key} on ${contentId} - ${e}`,
                level: 'error',
            },
        };
    }
};

module.exports = { modifyGlobalValueItemService };
