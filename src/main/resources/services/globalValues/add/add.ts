import nodeLib from '/lib/xp/node';
import { generateUUID } from '../../../lib/utils/uuid';
import {
    gvServiceInvalidRequestResponse,
    validateGlobalValueInputAndGetErrorResponse,
} from '../utils';
import { runInContext } from '../../../lib/context/run-in-context';
import { getGlobalValueSet } from '../../../lib/global-values/global-value-utils';
import { forceArray } from '../../../lib/utils/nav-utils';
import { logger } from '../../../lib/utils/logging';

const generateKey = () => `gv_${generateUUID()}`;

export const addGlobalValueItemService = (req: XP.Request) => {
    const errorResponse = validateGlobalValueInputAndGetErrorResponse(req.params);
    if (errorResponse) {
        return errorResponse;
    }

    const { contentId, itemName, type } = req.params;

    const content = runInContext({ branch: 'draft' }, () => getGlobalValueSet(contentId));
    if (!content || !contentId) {
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
            type,
            ...(type === 'caseTime'
                ? {
                      unit: req.params.unit,
                      value: Number(req.params.value),
                  }
                : { numberValue: Number(req.params.numberValue) }),
        };

        repo.modify({
            key: contentId,
            editor: (_content) => {
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
        logger.critical(`Error while adding new value to ${contentId} - ${e}`);
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
