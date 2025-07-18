import { Request } from '@enonic-types/core';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../../../lib/repos/repo-utils';
import { runInContext } from '../../../lib/context/run-in-context';
import { getGlobalValueSet } from '../../../lib/global-values/global-value-utils';
import { logger } from '../../../lib/utils/logging';
import { GlobalValueItem } from '../../../lib/global-values/types';
import { forceArray } from '../../../lib/utils/array-utils';
import { applyModifiedData } from '../../../lib/utils/content-utils';
import { CONTENT_ROOT_REPO_ID } from '../../../lib/constants';
import {
    gvServiceInvalidRequestResponse,
    validateGlobalValueInputAndGetErrorResponse,
} from '../utils';

const itemNameExists = (valueItems: GlobalValueItem[], itemName: string, key: string) =>
    itemName && valueItems.find((item) => item.itemName === itemName && item.key !== key);

export const modifyGlobalValueItemService = (req: Request) => {
    const errorResponse = validateGlobalValueInputAndGetErrorResponse(req.params);
    if (errorResponse) {
        return errorResponse;
    }

    const { contentId, key, itemName, type } = req.params as Record<string, string>;

    if (!key) {
        return gvServiceInvalidRequestResponse(`Parameter 'key' missing`);
    }

    const content = runInContext({ branch: 'draft' }, () => getGlobalValueSet(contentId));
    if (!content) {
        return gvServiceInvalidRequestResponse(`Global value set with id ${contentId} not found`);
    }

    const valueItems = forceArray(content.data?.valueItems);

    const itemToModify = valueItems.find((item) => item.key === key);
    if (!itemToModify) {
        gvServiceInvalidRequestResponse(`Item with key ${key} not found on ${contentId}`);
    }

    if (itemNameExists(valueItems, itemName, key)) {
        gvServiceInvalidRequestResponse(`Item name ${itemName} already exists on ${contentId}`);
    }

    try {
        const repo = getRepoConnection({
            repoId: CONTENT_ROOT_REPO_ID,
            branch: 'draft',
        });

        const modifiedItem = {
            key,
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
            key: content._id,
            editor: (_content) => {
                _content.data.valueItems = forceArray(content.data.valueItems).map((item) =>
                    item.key === key ? modifiedItem : item
                );
                return applyModifiedData(_content);
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
        logger.critical(`Error modifying ${key} on ${contentId} - ${e}`);
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
