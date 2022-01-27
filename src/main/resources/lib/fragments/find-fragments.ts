import contextLib from '/lib/xp/context';
import { contentLib, nodeLib } from '../xp-libs';
import { RepoBranch } from '../../types/common';
import {
    forceArray,
    getNestedValue,
    getUnixTimeFromDateTimeString,
    removeDuplicates,
} from '../nav-utils';
import { runInBranchContext } from '../headless/branch-context';
import { htmlAreaComponentPaths, htmlAreaDataPaths } from '../htmlarea/htmlarea';
import { getNodeKey } from '../time-travel/version-utils';

const htmlFragmentMacroPrefix = 'html-fragment fragmentId="';

const htmlFragmentMacroPattern = new RegExp(`${htmlFragmentMacroPrefix}[0-9a-z-]+`, 'gi');

const getContentNode = (contentRef: string, branch: RepoBranch) => {
    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch || context.branch,
    });

    return repo.get(getNodeKey(contentRef));
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
        const htmlArea = getNestedValue(contentNode.data, dataPath);
        return [...fragmentIdsAcc, ...getFragmentIdsFromHtmlArea(htmlArea)];
    }, [] as string[]);

    const fragmentIdsFromComponents = htmlAreaComponentPaths.reduce(
        (fragmentIdsAcc, componentPath) => {
            const fragmentIds = forceArray(contentNode.components).reduce((acc, component) => {
                const htmlArea = getNestedValue(component, componentPath);
                return [...acc, ...getFragmentIdsFromHtmlArea(htmlArea)];
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
export const getModifiedTimeIncludingFragments = (contentRef: string, branch: RepoBranch) =>
    runInBranchContext(() => {
        const content = contentLib.get({ key: contentRef });

        if (!content) {
            return null;
        }

        const contentModifiedTime = content.modifiedTime || content.createdTime;

        const fragmentIds = getFragmentIdsFromContent(contentRef, branch);

        return fragmentIds.reduce((latestModifiedTime, fragmentId) => {
            const fragment = contentLib.get({ key: fragmentId });
            if (!fragment) {
                log.error(
                    `Attempted to get modifiedTime from fragment id ${fragmentId} on content ${contentRef} on branch ${branch} but no fragment was found`
                );
                return latestModifiedTime;
            }

            const modifiedTime = fragment.modifiedTime;

            return getUnixTimeFromDateTimeString(modifiedTime) >
                getUnixTimeFromDateTimeString(latestModifiedTime)
                ? modifiedTime
                : latestModifiedTime;
        }, contentModifiedTime);
    }, branch);
