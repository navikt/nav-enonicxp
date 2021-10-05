const nodeLib = require('/lib/xp/node');
const { userIsAdmin } = require('/lib/auth/auth-utils');
const { insufficientPermissionResponse } = require('/lib/auth/auth-utils');
const { validateCurrentUserPermissionForContent } = require('/lib/auth/auth-utils');
const { forceArray } = require('/lib/nav-utils');
const { getGlobalValueSet, getGlobalValueUsage } = require('/lib/global-values/global-values');
const { gvServiceInvalidRequestResponse } = require('../utils');

const removeGlobalValueItemService = (req) => {
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

        log.warning(
            `Warning: removing in-use values with key ${key} - uses: ${JSON.stringify(usage)}`
        );
    }

    try {
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        repo.modify({
            key: contentId,
            editor: (_content) => {
                _content.data.valueItems = valueItems.filter((item) => item.key !== key);
                return _content;
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
        log.error(`Error deleting ${key} on ${contentId} - ${e}`);
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

module.exports = { removeGlobalValueItemService };
