const nodeLib = require('/lib/xp/node');
const contentLib = require('/lib/xp/content');
const { generateUUID } = require('/lib/headless/uuid');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');
const { getAllGlobalValues } = require('/lib/global-values/global-values');

const invalidRequestResponse = (msg) => ({
    status: 400,
    contentType: 'application/json',
    body: {
        message: msg || 'Invalid request',
    },
});

const generateKey = () => `gv_${generateUUID()}`;

const selectorHandler = () => {
    const getHits = () => {
        const values = getAllGlobalValues();

        return values
            .map((value) => ({
                id: value.globalKey,
                displayName: `${value.textValue} - ${value.setName}`,
                description: `Verdi-sett: ${value.setName}`,
            }))
            .flat();
    };

    const hits = getHits();

    log.info(`Hits: ${JSON.stringify(hits)}`);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            total: hits.length,
            count: hits.length,
            hits: hits,
        },
    };
};

const getKeyUsage = (params) => {
    const { key } = params;
    const uses = getGlobalValueUsage(key);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            uses,
        },
    };
};

const modifyItem = (params) => {
    const { contentId, key, itemName, textValue, numberValue } = params;

    if (!contentId || !key) {
        return invalidRequestResponse('ContentId and value-key must be provided');
    }

    const content = contentLib.get({ key: contentId });
    if (!content) {
        return invalidRequestResponse(`Content with id ${contentId} not found`);
    }

    const item = content.data?.valueItems?.find((item) => item.key === key);
    if (!item) {
        return invalidRequestResponse(`Item with key ${key} not found on ${contentId}`);
    }

    if (
        itemName &&
        content.data.valueItems.find((item) => item.itemName === itemName && item.key !== key)
    ) {
        return invalidRequestResponse(`Item name ${itemName} already exists on ${contentId}`);
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        repo.modify({
            key: contentId,
            editor: (content) => {
                content.data.valueItems = content.data.valueItems.map((item) =>
                    item.key === key
                        ? {
                              key,
                              itemName: itemName || item.itemName,
                              textValue: textValue || item.textValue,
                              numberValue: numberValue || item.numberValue,
                          }
                        : item
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

const addItem = (params) => {
    const { contentId, itemName, textValue, numberValue } = params;

    if (!contentId || !itemName || !textValue) {
        return invalidRequestResponse();
    }

    const content = contentLib.get({ key: contentId });
    if (!content) {
        return invalidRequestResponse(`Content with id ${contentId} not found`);
    }

    if (content.data?.valueItems?.find((item) => item.itemName === itemName)) {
        return invalidRequestResponse(`Item name ${itemName} already exists on ${contentId}`);
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        repo.modify({
            key: contentId,
            editor: (content) => {
                const newItem = {
                    key: generateKey(),
                    itemName,
                    textValue,
                    ...(numberValue && { numberValue }),
                };

                log.info(`new item: ${JSON.stringify(newItem)}`);

                const valueItems = content.data.valueItems;

                if (!valueItems) {
                    content.data.valueItems = newItem;
                } else if (!Array.isArray(valueItems)) {
                    content.data.valueItems = [valueItems, newItem];
                } else {
                    content.data.valueItems.push(newItem);
                }

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

const globalValues = (req) => {
    const { type } = req.params;
    log.info(JSON.stringify(req));

    if (type === 'selector') {
        return selectorHandler();
    }

    if (type === 'getKeyUsage') {
        return getKeyUsage(req.params);
    }

    if (type === 'addItem') {
        return addItem(req.params);
    }

    if (type === 'modifyItem') {
        return modifyItem(req.params);
    }

    return invalidRequestResponse();
};

exports.get = globalValues;
