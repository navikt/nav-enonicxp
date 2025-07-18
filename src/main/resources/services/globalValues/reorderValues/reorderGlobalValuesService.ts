import { Request, Response } from '@enonic-types/core';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../../../lib/repos/repo-utils';
import { gvServiceInvalidRequestResponse } from '../utils';
import { getGlobalValueSet } from '../../../lib/global-values/global-value-utils';
import { logger } from '../../../lib/utils/logging';
import { GlobalValueItem } from '../../../lib/global-values/types';
import { forceArray, parseJsonToArray } from '../../../lib/utils/array-utils';
import { applyModifiedData } from '../../../lib/utils/content-utils';
import { CONTENT_ROOT_REPO_ID } from '../../../lib/constants';

// Verify that the keys-array from the request matches the keys in the global values set
const validateKeys = (keysFromParam: string[], valueItems: GlobalValueItem[]) => {
    return (
        keysFromParam.length === valueItems.length &&
        valueItems.every((item) => keysFromParam.includes(item.key))
    );
};

export const reorderGlobalValuesService = (req: Request) : Response => {
    const contentId = req.params.contentId as string;
    const orderedKeys = req.params.orderedKeys as string;

    if (!contentId || !orderedKeys) {
        return gvServiceInvalidRequestResponse(
            `Missing parameters:${!orderedKeys && ' "orderedKeys"'}${!contentId && ' "contentId"'}`
        );
    }

    const keysParsed = parseJsonToArray<string>(orderedKeys);
    if (!keysParsed) {
        return gvServiceInvalidRequestResponse('Required parameter "orderedKeys" is invalid');
    }

    const content = getGlobalValueSet(contentId);
    if (!content) {
        return gvServiceInvalidRequestResponse(`Global value set with id ${contentId} not found`);
    }

    const items = forceArray(content.data.valueItems);
    if (!validateKeys(keysParsed, items)) {
        return gvServiceInvalidRequestResponse(
            `Keys provided does not match keys in global value set ${contentId}`
        );
    }

    const reorderedItems = keysParsed.map((key) => items.find((item) => item.key === key));

    try {
        const repo = getRepoConnection({
            repoId: CONTENT_ROOT_REPO_ID,
            branch: 'draft',
        });

        repo.modify<Content>({
            key: contentId,
            editor: (_content) => {
                _content.data.valueItems = reorderedItems;
                return applyModifiedData(_content);
            },
        });

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                message: `Successfully reordered values on ${contentId}`,
                level: 'info',
            },
        };
    } catch (e) {
        const message = `Error reordering values on ${contentId} - ${e}`;
        logger.error(message);
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message,
                level: 'error',
            },
        };
    }
};
