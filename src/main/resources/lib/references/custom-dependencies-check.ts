import { Content } from '/lib/xp/content';
import { CONTENT_ROOT_PROJECT_ID, CONTENT_STUDIO_PATH_PREFIX } from '../constants';

export type CustomDependenciesCheckParams = {
    id: string;
    layer: string;
};

export type CustomDependencyData = {
    name: string;
    path: string;
    editorPath: string;
    id: string;
};

export const transformToCustomDependencyData = (
    content: Content,
    projectId = CONTENT_ROOT_PROJECT_ID
): CustomDependencyData => ({
    name: content.displayName,
    path: content._path,
    editorPath: `${CONTENT_STUDIO_PATH_PREFIX}/${projectId}/edit/${content._id}`,
    id: content._id,
});
