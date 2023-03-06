import { getRepoConnection } from '../utils/repo-connection';
import { getNodeVersions } from '../utils/version-utils';
import { NodeEventData } from './utils';
import { getCustomPathFromContent } from '../paths/custom-paths/custom-path-utils';
import { getFrontendPathname } from '../paths/path-utils';

export const findChangedPaths = ({ id, path, repo }: NodeEventData) => {
    const repoConnection = getRepoConnection({
        repoId: repo,
        branch: 'master',
    });

    const previousVersion = getNodeVersions({
        nodeKey: id,
        repo: repoConnection,
        branch: 'master',
    })?.[1];

    if (!previousVersion) {
        return [];
    }

    const changedPaths = [];

    const previousPath = getFrontendPathname(previousVersion.nodePath);
    const currentPath = getFrontendPathname(path);

    // If the "normal" path changed, include the previous path
    if (previousPath !== currentPath) {
        changedPaths.push(previousPath);
    }

    const currentCustomPath = getCustomPathFromContent(id);
    const previousCustomPath = getCustomPathFromContent(
        previousVersion.nodeId,
        previousVersion.versionId
    );

    if (previousCustomPath !== currentCustomPath) {
        // If the custom path changed, include the current normal path, as this should now
        // redirect to the new custom path
        changedPaths.push(currentPath);

        // If there was a previous custom path, this will no longer be valid for this content
        if (previousCustomPath) {
            changedPaths.push(previousCustomPath);
        }
    }

    return changedPaths;
};
