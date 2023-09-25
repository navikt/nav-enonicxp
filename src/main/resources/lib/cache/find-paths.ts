import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getNodeVersions } from '../utils/version-utils';
import { isPublicRenderedType, NodeEventData } from './utils';
import { getCustomPathFromContent } from '../paths/custom-paths/custom-path-utils';
import { getFrontendPathname, stripPathPrefix } from '../paths/path-utils';
import { getPublicPath } from '../paths/public-path';
import { logger } from '../utils/logging';
import { getLayersData } from '../localization/layers-data';
import { ContentReferencesFinder } from './find-refs-new';
import { removeDuplicates } from '../utils/array-utils';
import { RepoBranch } from '../../types/common';

const REFERENCE_SEARCH_TIMEOUT_MS = 10000;

const getPublicPathsForContent = (contents: Content[], locale: string) =>
    contents.reduce<string[]>((acc, content) => {
        if (isPublicRenderedType(content)) {
            const publicPath = getPublicPath(content, locale);
            acc.push(publicPath);

            const internalPath = stripPathPrefix(content._path);
            if (internalPath !== publicPath) {
                acc.push(internalPath);
            }
        }

        return acc;
    }, []);

const findReferencedPaths = (id: string, branch: RepoBranch) => {
    const { locales, localeToRepoIdMap } = getLayersData();

    const pathsToInvalidate: string[] = [];

    const success = locales.every((locale) => {
        const repoId = localeToRepoIdMap[locale];

        const contentReferenceFinder = new ContentReferencesFinder({
            contentId: id,
            branch,
            repoId,
            withDeepSearch: true,
            timeout: REFERENCE_SEARCH_TIMEOUT_MS,
        });

        const references = contentReferenceFinder.run();
        if (!references) {
            return false;
        }

        const localizedPaths = getPublicPathsForContent(references, locale);

        pathsToInvalidate.push(...localizedPaths);
        return true;
    });

    return success ? removeDuplicates(pathsToInvalidate) : null;
};

const findChangedPaths = ({ id, path, repo }: NodeEventData) => {
    const previousVersion = getNodeVersions({
        nodeKey: id,
        repoId: repo,
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

const getNodePaths = (contentId: string, locale: string) => {
    const content = contentLib.get({ key: contentId });
    if (!content) {
        return [];
    }

    const internalPath = stripPathPrefix(content._path);
    const publicPath = getPublicPath(content, locale);

    return [internalPath, publicPath];
};

export const findPathsToInvalidate = (nodeEventData: NodeEventData, eventType: string) => {
    const { id, repo } = nodeEventData;

    const locale = getLayersData().repoIdToLocaleMap[repo];

    const nodePaths = getNodePaths(id, locale);
    logger.info(`Node paths: ${JSON.stringify(nodePaths)}`);

    const changedPaths = findChangedPaths(nodeEventData);
    logger.info(`Changed paths: ${JSON.stringify(changedPaths)}`);

    // If the content was deleted, we must check in the draft branch for references
    const referencePaths = findReferencedPaths(
        id,
        eventType === 'node.deleted' ? 'draft' : 'master'
    );
    if (!referencePaths) {
        return null;
    }

    return removeDuplicates([...nodePaths, ...changedPaths, ...referencePaths]);
};
