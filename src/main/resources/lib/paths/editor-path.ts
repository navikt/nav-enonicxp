import * as contextLib from '/lib/xp/context';
import { getContentProjectIdFromRepoId } from '../repos/repo-utils';
import { CONTENT_ROOT_REPO_ID, CONTENT_STUDIO_PATH_PREFIX } from '../constants';

export const buildEditorPath = (contentId: string, repoId: string) => {
    const projectId = getContentProjectIdFromRepoId(repoId);
    return `${CONTENT_STUDIO_PATH_PREFIX}/${projectId}/edit/${contentId}`;
};

export const buildEditorPathFromContext = (contentId: string) => {
    const repoId = contextLib.get().repository || CONTENT_ROOT_REPO_ID;
    return buildEditorPath(contentId, repoId);
};
