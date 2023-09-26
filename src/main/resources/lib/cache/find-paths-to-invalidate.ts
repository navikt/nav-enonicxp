import { Content } from '/lib/xp/content';
import { getNodeVersions } from '../utils/version-utils';
import { isPublicRenderedType, NodeEventData } from './utils';
import { getCustomPathFromContent } from '../paths/custom-paths/custom-path-utils';
import { stripPathPrefix } from '../paths/path-utils';
import { getPublicPath } from '../paths/public-path';
import { getLayersData } from '../localization/layers-data';
import { ContentReferencesFinder } from './content-references-finder';
import { removeDuplicates } from '../utils/array-utils';
import { RepoBranch } from '../../types/common';
import { getRepoConnection } from '../utils/repo-utils';

const REFERENCE_SEARCH_TIMEOUT_MS = 10000;

const getPathsForContent = (content: Content, locale: string) => {
    if (!isPublicRenderedType(content)) {
        return [];
    }

    const publicPath = getPublicPath(content, locale);
    const internalPath = stripPathPrefix(content._path);

    if (internalPath !== publicPath) {
        return [internalPath, publicPath];
    }

    return [publicPath];
};

const findReferencedPaths = (contentId: string, repoId: string, branch: RepoBranch) => {
    const { locales, localeToRepoIdMap, repoIdToLocaleMap, defaultLocale } = getLayersData();

    const pathsToInvalidate: string[] = [];

    const sourceLocale = repoIdToLocaleMap[repoId];

    // If the source locale is the default from which the other layers inherit
    // we need to search in all locales.
    const localesToSearch = sourceLocale === defaultLocale ? locales : [sourceLocale];

    const success = localesToSearch.every((locale) => {
        const repoId = localeToRepoIdMap[locale];

        const contentReferenceFinder = new ContentReferencesFinder({
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
            pathsToInvalidate.push(...getPathsForContent(content, locale));
        });

        return true;
    });

    return success ? removeDuplicates(pathsToInvalidate) : null;
};

const findChangedPaths = (contentId: string, repoId: string, path: string) => {
    const previousVersion = getNodeVersions({
        nodeKey: contentId,
        repoId: repoId,
        branch: 'master',
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
    const content = getRepoConnection({ branch, repoId, asAdmin: true }).get(contentId);
    if (!content) {
        return [];
    }

    const locale = getLayersData().repoIdToLocaleMap[repoId];

    return getPathsForContent(content, locale);
};

export const findPathsToInvalidate = (nodeEventData: NodeEventData, eventType: string) => {
    const { id, path, repo } = nodeEventData;

    // If the content was deleted, we must check in the draft branch
    const branch = eventType === 'node.deleted' ? 'draft' : 'master';

    const nodePaths = getNodePaths(id, repo, branch);
    const changedPaths = findChangedPaths(id, repo, path);
    const referencePaths = findReferencedPaths(id, repo, branch);

    // If the reference search failed, return null to trigger invalidation of the entire cache
    if (!referencePaths) {
        return null;
    }

    return removeDuplicates([...nodePaths, ...changedPaths, ...referencePaths]);
};
