import * as contextLib from '/lib/xp/context';
import * as contentLib from '/lib/xp/content';
import { logger } from '../utils/logging';
import { getContentProjectIdFromRepoId } from '../utils/repo-utils';
import { CONTENT_ROOT_PROJECT_ID, CONTENT_STUDIO_PATH_PREFIX } from '../constants';
import { isContentLocalized } from '../localization/locale-utils';

export const buildEditorPathFromContext = (contentId: string) => {
    const { repository } = contextLib.get();
    if (!repository) {
        logger.error('Could not determine current repo from context!');
    }

    const content = contentLib.get({ key: contentId });

    const projectId =
        repository && content && isContentLocalized(content)
            ? getContentProjectIdFromRepoId(repository)
            : CONTENT_ROOT_PROJECT_ID;

    return `${CONTENT_STUDIO_PATH_PREFIX}/${projectId}/edit/${contentId}`;
};
