import nodeLib from '/lib/xp/node';
import { generateUUID } from '../../../lib/utils/uuid';
import {
    GlobalValueInput,
    gvServiceInvalidRequestResponse,
    validateGlobalValueInputAndGetErrorResponse,
} from '../utils';
import { runInBranchContext } from '../../../lib/utils/branch-context';
import { getGlobalValueSet } from '../../../lib/utils/global-value-utils';
import { forceArray } from '../../../lib/utils/nav-utils';

const generateKey = () => `gv_${generateUUID()}`;

export const addGlobalValueItemService = (req: XP.Request) => {
    const errorResponse = validateGlobalValueInputAndGetErrorResponse(req.params);
    if (errorResponse) {
        return errorResponse;
    }

    const { contentId, itemName, numberValue } = req.params as unknown as GlobalValueInput;

    const content = runInBranchContext(() => getGlobalValueSet(contentId), 'draft');
    if (!content) {
        return gvServiceInvalidRequestResponse(`Global value set with id ${contentId} not found`);
    }

    const valueItems = forceArray(content.data?.valueItems);
    const nameExists = valueItems.some((item) => item.itemName === itemName);

    if (nameExists) {
        return gvServiceInvalidRequestResponse(
            `Item name ${itemName} already exists on ${contentId}`
        );
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        const newItem = {
            key: generateKey(),
            itemName,
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
                level: 'info',
            },
        };
    } catch (e) {
        log.error(`Error while adding new value to ${contentId} - ${e}`);
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: `Failed to add new item with name ${itemName} to content ${contentId} - Error: ${e}`,
                level: 'error',
            },
        };
    }
};
