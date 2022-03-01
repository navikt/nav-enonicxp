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

    const previousPaths = [];

    const previousVersion = getNodeVersions({ nodeKey: id, repo, branch: 'master' })?.[1];

    if (previousVersion) {
        const previousPath = getFrontendPathname(previousVersion.nodePath);
        const currentPath = getFrontendPathname(path);

        if (previousPath !== currentPath) {
            previousPaths.push(previousPath);
        }

        const currentCustomPath = getCustomPathFromContent(id);

        const previousCustomPath = getCustomPathFromContent(
            previousVersion.nodeId,
            previousVersion.versionId
        );

        if (previousCustomPath && previousCustomPath !== currentCustomPath) {
            previousPaths.push(previousCustomPath);
        }
    }

    return previousPaths;
};
