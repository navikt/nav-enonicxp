import nodeLib from '/lib/xp/node';
import { contentRepo } from '../constants';
import { getNodeVersions } from '../time-travel/version-utils';
import { getFrontendPathname } from './utils';
import { getCustomPathFromContent } from '../custom-paths/custom-paths';

export const findChangedPaths = ({ id, path }: { id: string; path: string }) => {
    const repo = nodeLib.connect({
        repoId: contentRepo,
        branch: 'master',
    });

    const changedPaths = [];

    const previousVersion = getNodeVersions({ nodeKey: id, repo, branch: 'master' })?.[1];

    if (previousVersion) {
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
    }

    return changedPaths;
};
