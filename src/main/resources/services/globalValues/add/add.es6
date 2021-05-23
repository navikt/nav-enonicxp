const nodeLib = require('/lib/xp/node');
const contentLib = require('/lib/xp/content');
const { insufficientAccessResponse } = require('/lib/auth/auth-utils');
const { validateCurrentUserPermission } = require('/lib/auth/auth-utils');
const { forceArray } = require('/lib/nav-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { generateUUID } = require('/lib/headless/uuid');

const invalidRequest = (msg) => ({
    status: 400,
    contentType: 'application/json',
    body: {
        message: `Invalid add request: ${msg}`,
    },
});

const generateKey = () => `gv_${generateUUID()}`;

const addGlobalValueItem = (req) => {
    const { contentId, itemName, textValue, numberValue } = req.params;

    if (!validateCurrentUserPermission(contentId, 'MODIFY')) {
        return insufficientAccessResponse('MODIFY');
    }

    if (!contentId || !itemName || !textValue) {
        return invalidRequest(
            'Bad request: Missing parameters:' +
                `${!contentId && ' contentId'}` +
                `${!itemName && ' itemName'}` +
                `${!textValue && ' textValue'}'`
        );
    }

    const content = runInBranchContext(() => contentLib.get({ key: contentId }), 'draft');
    if (!content) {
        return invalidRequest(`Content with id ${contentId} not found`);
    }

    const valueItems = forceArray(content.data?.valueItems);

    if (valueItems.find((item) => item.itemName === itemName)) {
        return invalidRequest(`Item name ${itemName} already exists on ${contentId}`);
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        const newItem = {
            key: generateKey(),
            itemName,
            textValue,
            ...(numberValue !== undefined && { numberValue }),
        };

        repo.modify({
            key: contentId,
            editor: (content) => {
                log.info(`new item: ${JSON.stringify(newItem)}`);
                content.data.valueItems = [...valueItems, newItem];

                return content;
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

module.exports = { addGlobalValueItem };
