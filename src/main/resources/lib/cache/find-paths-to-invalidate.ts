import { getNodeVersions } from '../utils/version-utils';
import { isPublicRenderedType, NodeEventData } from './utils';
import { getCustomPathFromContent } from '../paths/custom-paths/custom-path-utils';
import { stripPathPrefix, stripRedirectsPathPrefix } from '../paths/path-utils';
import { getPublicPath } from '../paths/public-path';
import { getLayersData } from '../localization/layers-data';
import { ReferencesFinder } from '../reference-search/references-finder';
import { removeDuplicates } from '../utils/array-utils';
import { RepoBranch } from '../../types/common';
import { getContentFromAllLayers } from '../localization/layers-repo-utils/get-content-from-all-layers';

const REFERENCE_SEARCH_TIMEOUT_MS = 10000;

const findReferencedPaths = (contentId: string, repoId: string, branch: RepoBranch) => {
    const { locales, localeToRepoIdMap, repoIdToLocaleMap, defaultLocale } = getLayersData();

    const pathsToInvalidate: string[] = [];

    const sourceLocale = repoIdToLocaleMap[repoId];

    // If the source locale is the default from which the other layers inherit
    // we need to search in all locales.
    const localesToSearch = sourceLocale === defaultLocale ? locales : [sourceLocale];

    const success = localesToSearch.every((locale) => {
        const repoId = localeToRepoIdMap[locale];

        const contentReferenceFinder = new ReferencesFinder({
            contentId,
            branch,
            repoId,
            withDeepSearch: true,
            timeout: REFERENCE_SEARCH_TIMEOUT_MS,
        });

        const references = contentReferenceFinder.run();
        if (!references) {
            return false;
        }

        references.forEach((content) => {
            if (isPublicRenderedType(content)) {
                pathsToInvalidate.push(getPublicPath(content, locale));
            }
        });

        return true;
    });

    return success ? pathsToInvalidate : null;
};

const findChangedPaths = (contentId: string, repoId: string, path: string) => {
    const previousVersion = getNodeVersions({
        nodeKey: contentId,
        repoId: repoId,
        branch: 'main',
    })?.[1];

    if (!previousVersion) {
        return [];
    }

    const changedPaths = [];

    const previousPath = stripPathPrefix(previousVersion.nodePath);
    const currentPath = stripPathPrefix(path);

    // If the internal path changed, include the previous path
    if (previousPath !== currentPath) {
        changedPaths.push(previousPath);
    }

    const currentCustomPath = getCustomPathFromContent(contentId);
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

const getNodePaths = (contentId: string, repoId: string, branch: RepoBranch) => {
    const allVersions = getContentFromAllLayers({ contentId, branch, state: 'localized' });
    if (allVersions.length === 0) {
        return [];
    }

    const publicPaths = allVersions.map((version) =>
        getPublicPath(version.content, version.locale)
    );

    const baseContent = allVersions.find((version) => version.repoId === repoId)?.content;
    if (!baseContent) {
        return publicPaths;
    }

    if (!isPublicRenderedType(baseContent)) {
        return [];
    }

    const internalPath = stripPathPrefix(baseContent._path);
    const changedPaths = findChangedPaths(contentId, repoId, baseContent._path);

    return [internalPath, ...publicPaths, ...changedPaths].map(stripRedirectsPathPrefix);
};

export const findPathsToInvalidate = (nodeEventData: NodeEventData, eventType: string) => {
    const { id, repo } = nodeEventData;

    // If the content was deleted, we must check in the draft branch
    const branch = eventType === 'node.deleted' ? 'draft' : 'master';

    const nodePaths = getNodePaths(id, repo, branch);
    const referencePaths = findReferencedPaths(id, repo, branch);

    // If the reference search failed, return null to trigger invalidation of the entire cache
    if (!referencePaths) {
        return null;
    }

    return removeDuplicates([...nodePaths, ...referencePaths]);
};
