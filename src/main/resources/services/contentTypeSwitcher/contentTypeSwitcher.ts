import nodeLib from '/lib/xp/node';
import { validateCurrentUserPermissionForContent } from '../../lib/utils/auth-utils';
import { contentTypesInContentSwitcher } from '../../lib/contenttype-lists';
import { stringArrayToSet } from '../../lib/utils/nav-utils';
import { logger } from '../../lib/utils/logging';

const contentTypesMap = stringArrayToSet(contentTypesInContentSwitcher);

const setContentType = (repoId: string, contentId: string, contentType: string) => {
    try {
        const repo = nodeLib.connect({
            repoId: repoId,
            branch: 'draft',
        });

        repo.modify({
            key: contentId,
            editor: (content) => {
                content.type = contentType;
                content.components = [];
                content.data = {};

                return content;
            },
        });
        logger.info(`Changed content type for ${contentId} to ${contentType}`);
    } catch (e) {
        logger.error(
            `Error while attempting to change content type for ${contentId} to ${contentType} - ${e}`
        );
    }
};

export const get = (req: XP.Request) => {
    const { repoId, contentId, contentType } = req.params as {
        repoId: string;
        contentId: string;
        contentType: string;
    };

    if (!repoId || !contentId || !contentType) {
        logger.warning(
            `Malformed content-type switch request occured - repoId: ${repoId} - contentId: ${contentId} - contentType: ${contentType}`
        );
        return {
            status: 400,
        };
    }

    if (!validateCurrentUserPermissionForContent(contentId, 'PUBLISH')) {
        logger.warning(
            `Unauthorized content-type switch request occured - repoId: ${repoId} - contentId: ${contentId} - contentType: ${contentType}`
        );
        return {
            status: 401,
        };
    }

    if (!contentTypesMap[contentType]) {
        logger.warning(
            `Attempted to switch to a content type that is not allowed - repoId: ${repoId} - contentId: ${contentId} - contentType: ${contentType}`
        );
        return {
            status: 400,
        };
    }

    setContentType(repoId, contentId, contentType);

    return {
        status: 204,
    };
};
