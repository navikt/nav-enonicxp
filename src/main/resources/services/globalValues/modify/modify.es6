const nodeLib = require('/lib/xp/node');
const { insufficientAccessResponse } = require('/lib/auth/auth-utils');
const { validateCurrentUserPermissionForContent } = require('/lib/auth/auth-utils');
const { forceArray } = require('/lib/nav-utils');
const { getGlobalValueSet } = require('/lib/global-values/global-values');

const invalidRequest = (msg) => ({
    status: 400,
    contentType: 'application/json',
    body: {
        message: `Invalid modify request: ${msg}`,
    },
});

const itemNameExists = (valueItems, itemName, key) =>
    itemName && valueItems.find((item) => item.itemName === itemName && item.key !== key);

const modifyGlobalValueItem = (req) => {
    const { contentId, key, itemName, textValue, numberValue } = req.params;

    if (!validateCurrentUserPermissionForContent(contentId, 'MODIFY')) {
        return insufficientAccessResponse('MODIFY');
    }

    if (!contentId || !key) {
        return invalidRequest('ContentId and value-key must be provided');
    }

    const content = getGlobalValueSet(contentId);
    if (!content) {
        return invalidRequest(`Global value set with id ${contentId} not found`);
    }

    const valueItems = forceArray(content.data?.valueItems);

    const itemToModify = valueItems.find((item) => item.key === key);
    if (!itemToModify) {
        return invalidRequest(`Item with key ${key} not found on ${contentId}`);
    }

    if (itemNameExists(valueItems, itemName, key)) {
        return invalidRequest(`Item name ${itemName} already exists on ${contentId}`);
    }

    if (numberValue !== undefined && isNaN(numberValue)) {
        return invalidRequest(`numberValue ${numberValue} is not a number`);
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        const modifiedItem = {
            key,
            itemName,
            textValue,
            ...(numberValue && { numberValue: parseFloat(numberValue) }),
        };

        repo.modify({
            key: contentId,
            editor: (content) => {
                content.data.valueItems = valueItems.map((item) =>
                    item.key === key ? modifiedItem : item
                );

                return content;
            },
        });

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                message: `Successfully modified ${key} on ${contentId}`,
            },
        };
    } catch (e) {
        log.error(`Error modifying ${key} on ${contentId} - ${e}`);
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: `Error modifying ${key} on ${contentId} - ${e}`,
            },
        };
    }
};

module.exports = { modifyGlobalValueItem };
