import { getRepoConnection } from '../../../lib/repos/repo-utils';
import { generateUUID } from '../../../lib/utils/uuid';
import {
    gvServiceInvalidRequestResponse,
    validateGlobalValueInputAndGetErrorResponse,
} from '../utils';
import { runInContext } from '../../../lib/context/run-in-context';
import { getGlobalValueSet } from '../../../lib/global-values/global-value-utils';
import { logger } from '../../../lib/utils/logging';
import { forceArray } from '../../../lib/utils/array-utils';
import { applyModifiedData } from '../../../lib/utils/content-utils';
import { CONTENT_ROOT_REPO_ID } from '../../../lib/constants';
import { Content } from '/lib/xp/content';

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
        const repo = getRepoConnection({
            repoId: CONTENT_ROOT_REPO_ID,
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

        repo.modify<Content>({
            key: contentId,
            editor: (_content) => {
                _content.data.valueItems = [...valueItems, newItem];
                return applyModifiedData(_content);
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
