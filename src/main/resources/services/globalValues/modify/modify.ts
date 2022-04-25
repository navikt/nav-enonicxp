import nodeLib from '/lib/xp/node';
import {
    GlobalValueInput,
    gvServiceInvalidRequestResponse,
    validateGlobalValueInputAndGetErrorResponse,
} from '../utils';
import { runInBranchContext } from '../../../lib/utils/branch-context';
import { getGlobalValueSet } from '../../../lib/utils/global-value-utils';
import { forceArray } from '../../../lib/utils/nav-utils';
import { GlobalValueItem } from '../../../types/content-types/global-value-set';

const itemNameExists = (valueItems: GlobalValueItem[], itemName: string, key: string) =>
    itemName && valueItems.find((item) => item.itemName === itemName && item.key !== key);

export const modifyGlobalValueItemService = (req: XP.Request) => {
    const errorResponse = validateGlobalValueInputAndGetErrorResponse(req.params);
    if (errorResponse) {
        return errorResponse;
    }

    const { contentId, key, itemName, numberValue } = req.params as unknown as GlobalValueInput & {
        key?: string;
    };

    if (!key) {
        return gvServiceInvalidRequestResponse(`Parameter 'key' missing`);
    }

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