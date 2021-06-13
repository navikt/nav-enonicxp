const nodeLib = require('/lib/xp/node');
const { validateGlobalValueInputAndGetErrorResponse } = require('/lib/global-values/global-values');
const { getGlobalValueSet } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { generateUUID } = require('/lib/headless/uuid');

const generateKey = () => `gv_${generateUUID()}`;

const addGlobalValueItem = (req) => {
    const errorResponse = validateGlobalValueInputAndGetErrorResponse(req.params);
    if (errorResponse) {
        return errorResponse;
    }

    const { contentId, itemName, textValue, numberValue } = req.params;

    const content = runInBranchContext(() => getGlobalValueSet(contentId), 'draft');
    if (!content) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: `Global value set with id ${contentId} not found`,
            },
        };
    }

    const valueItems = forceArray(content.data?.valueItems);
    const nameExists = valueItems.some((item) => item.itemName === itemName);

    if (nameExists) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: `Item name ${itemName} already exists on ${contentId}`,
            },
        };
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        const newItem = {
            key: generateKey(),
            itemName,
            ...(textValue && { textValue }),
            ...(numberValue !== undefined && { numberValue }),
        };

        repo.modify({
            key: contentId,
            editor: (_content) => {
                log.info(`new item: ${JSON.stringify(newItem)}`);
                _content.data.valueItems = [...valueItems, newItem];

                return _content;
            },
        });

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                message: `Successfully added new item with name ${itemName} to content ${contentId}`,
            },
        };
    } catch (e) {
        log.error(`Error while adding new value to ${contentId} - ${e}`);
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: `Failed to add new item with name ${itemName} to content ${contentId} - Error: ${e}`,
            },
        };
    }
};

module.exports = {
    addGlobalValueItem,
};
