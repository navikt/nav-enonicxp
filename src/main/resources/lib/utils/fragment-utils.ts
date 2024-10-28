import * as contextLib from '/lib/xp/context';
import { getRepoConnection } from './repo-utils';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { htmlAreaComponentPaths, htmlAreaDataPaths } from './htmlarea-utils';
import { runInContext } from '../context/run-in-context';
import { logger } from './logging';
import { forceArray, removeDuplicates } from './array-utils';
import { getNestedValues } from './object-utils';
import { getContentNodeKey } from './content-utils';

const htmlFragmentMacroPrefix = 'html-fragment fragmentId="';

const htmlFragmentMacroPattern = new RegExp(`${htmlFragmentMacroPrefix}[0-9a-z-]+`, 'gi');

const getContentNode = (contentRef: string, branch: RepoBranch) => {
    const context = contextLib.get();
    const repo = getRepoConnection({
        repoId: context.repository,
        branch: branch || context.branch,
    });

    return repo.get<Content>(getContentNodeKey(contentRef));
};

const getFragmentIdsFromHtmlArea = (htmlAreaString: string): string[] => {
    if (!htmlAreaString) {
        return [];
    }

    const fragmentIds = htmlAreaString.match(htmlFragmentMacroPattern);

    return fragmentIds ? fragmentIds.map((id) => id.replace(htmlFragmentMacroPrefix, '')) : [];
};

// Gets fragment ids from fragment components in a content
const getFragmentIdsFromComponents = (contentRef: string, branch: RepoBranch) => {
    const contentNode = getContentNode(contentRef, branch);

    if (!contentNode) {
        return [];
    }

    return forceArray(contentNode.components).reduce((fragmentIds, component) => {
        if (component.type !== 'fragment') {
            return fragmentIds;
        }

        const fragmentId = component.fragment?.id;
        return fragmentId && !fragmentIds.includes(fragmentId)
            ? [...fragmentIds, fragmentId]
            : fragmentIds;
    }, [] as string[]);
};

// Gets fragment ids referenced from HtmlFragment macros in a content
const getFragmentIdsFromMacros = (contentRef: string, branch: RepoBranch) => {
    const contentNode = getContentNode(contentRef, branch);

    if (!contentNode) {
        return [];
    }

    const fragmentIdsFromData = htmlAreaDataPaths.reduce((fragmentIdsAcc, dataPath) => {
        const htmlArea = getNestedValues(contentNode.data, dataPath);
        if (typeof htmlArea === 'string') {
            fragmentIdsAcc.push(...getFragmentIdsFromHtmlArea(htmlArea));
        }

        return fragmentIdsAcc;
    }, [] as string[]);

    const fragmentIdsFromComponents = htmlAreaComponentPaths.reduce(
        (fragmentIdsAcc, componentPath) => {
            const fragmentIds = forceArray(contentNode.components).reduce((acc, component) => {
                const htmlArea = getNestedValues(component, componentPath);
                if (typeof htmlArea === 'string') {
                    fragmentIdsAcc.push(...getFragmentIdsFromHtmlArea(htmlArea));
                }

                return acc;
            }, [] as string[]);

            return [...fragmentIdsAcc, ...fragmentIds];
        },
        [] as string[]
    );

    return [...fragmentIdsFromData, ...fragmentIdsFromComponents];
};

const getFragmentIdsFromContent = (contentRef: string, branch: RepoBranch) => {
    const fragmentIdsFromMacros = getFragmentIdsFromMacros(contentRef, branch);
    const fragmentIdsFromComponents = getFragmentIdsFromComponents(contentRef, branch);

    return removeDuplicates([...fragmentIdsFromMacros, ...fragmentIdsFromComponents]);
};

// Returns the most recent modifiedTime value, taking into account both the content
// itself and any fragments used in the content
export const getModifiedTimeIncludingFragments = (content: Content, branch: RepoBranch) =>
    runInContext({ branch }, () => {
        const contentModifiedTime = content.modifiedTime || content.createdTime;
        const contentId = content._id;

        const fragmentIds = getFragmentIdsFromContent(contentId, branch);

        return fragmentIds.reduce((latestModifiedTime, fragmentId) => {
            const fragment = contentLib.get({ key: fragmentId });
            if (!fragment) {
                if (branch === 'master') {
                    logger.error(
                        `Attempted to get modifiedTime from fragment id ${fragmentId} on content ${contentId} on branch ${branch} but no fragment was found`
                    );
                }
                return latestModifiedTime;
            }

            const modifiedTime = fragment.modifiedTime || fragment.createdTime;

            return modifiedTime > latestModifiedTime ? modifiedTime : latestModifiedTime;
        }, contentModifiedTime);
    });
