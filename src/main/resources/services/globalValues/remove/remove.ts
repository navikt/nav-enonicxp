import { getRepoConnection } from '../../../lib/utils/repo-utils';
import {
    insufficientPermissionResponse,
    userIsAdmin,
    validateCurrentUserPermissionForContent,
} from '../../../lib/utils/auth-utils';
import { gvServiceInvalidRequestResponse } from '../utils';
import {
    getGlobalValueSet,
    getGlobalValueUsage,
} from '../../../lib/global-values/global-value-utils';
import { logger } from '../../../lib/utils/logging';
import { forceArray } from '../../../lib/utils/array-utils';
import { applyModifiedData } from '../../../lib/utils/content-utils';
import { CONTENT_ROOT_REPO_ID } from '../../../lib/constants';

export const removeGlobalValueItemService = (req: XP.Request) => {
    const { key, contentId } = req.params;

    if (!validateCurrentUserPermissionForContent(contentId, 'DELETE')) {
        return insufficientPermissionResponse('DELETE');
    }

    if (!key || !contentId) {
        return gvServiceInvalidRequestResponse(
            `Missing parameters:${!key && ' "key"'}${!contentId && ' "contentId"'}`
        );
    }

    const content = getGlobalValueSet(contentId);
    if (!content) {
        return gvServiceInvalidRequestResponse(`Global value set with id ${contentId} not found`);
    }

    const valueItems = forceArray(content.data?.valueItems);

    const itemExists = valueItems.some((item) => item.key === key);
    if (!itemExists) {
        return gvServiceInvalidRequestResponse(`Item with key ${key} not found on ${contentId}`);
    }

    const usage = getGlobalValueUsage(key, contentId);
    if (usage.length > 0) {
        if (!userIsAdmin()) {
            return insufficientPermissionResponse('administrator');
        }

        logger.critical(
            `Removing in-use value with key ${key} - uses: ${usage
                .map((hit) => hit._path)
                .join(', ')}`
        );
    }

    try {
        const repo = getRepoConnection({
            repoId: CONTENT_ROOT_REPO_ID,
            branch: 'draft',
        });

        repo.modify({
            key: contentId,
            editor: (_content) => {
                _content.data.valueItems = valueItems.filter((item) => item.key !== key);
                return applyModifiedData(_content);
            },
        });

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                message: `Successfully deleted ${key} on ${contentId}`,
                level: 'info',
            },
        };
    } catch (e) {
        logger.critical(`Error deleting value ${key} on ${contentId} - ${e}`);
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: `Error deleting ${key} on ${contentId} - ${e}`,
                level: 'error',
            },
        };
    }
};
