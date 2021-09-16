const nodeLib = require('/lib/xp/node');
const contextLib = require('/lib/xp/context');
const contentLib = require('/lib/xp/content');
const { removeDuplicates } = require('/lib/nav-utils');
const { getNodeKey } = require('/lib/time-travel/version-utils');
const { forceArray, getNestedValue, getUnixTimeFromDateTimeString } = require('/lib/nav-utils');
const { htmlAreaDataPaths, htmlAreaComponentPaths } = require('/lib/htmlarea/htmlarea');

const htmlFragmentMacroPrefix = 'html-fragment fragmentId="';

const htmlFragmentMacroPattern = new RegExp(`${htmlFragmentMacroPrefix}[0-9a-z-]+`, 'gi');

const getContentNode = (contentRef, branch) => {
    const context = contextLib.get();
    const repo = nodeLib.connect({
        repoId: context.repository,
        branch: branch || context.branch,
    });

    return repo.get(getNodeKey(contentRef));
};

const getFragmentIdsFromHtmlArea = (htmlAreaString) => {
    if (!htmlAreaString) {
        return [];
    }

    const fragmentIds = htmlAreaString.match(htmlFragmentMacroPattern);

    return fragmentIds ? fragmentIds.map((id) => id.replace(htmlFragmentMacroPrefix, '')) : [];
};

// Gets fragment ids from fragment components in a content
const getFragmentIdsFromComponents = (contentRef, branch) => {
    const contentNode = getContentNode(contentRef, branch);

    if (!contentNode) {
        return [];
    }

    return forceArray(contentNode.components).reduce((fragmentIds, component) => {
        const fragmentId = component.fragment?.id;
        return fragmentId && !fragmentIds.includes(fragmentId)
            ? [...fragmentIds, fragmentId]
            : fragmentIds;
    }, []);
};

// Gets fragment ids referenced from HtmlFragment macros in a content
const getFragmentIdsFromMacros = (contentRef, branch) => {
    const contentNode = getContentNode(contentRef, branch);

    if (!contentNode) {
        return [];
    }

    const fragmentIdsFromData = htmlAreaDataPaths.reduce((fragmentIdsAcc, dataPath) => {
        const htmlArea = getNestedValue(contentNode.data, dataPath);
        return [...fragmentIdsAcc, ...getFragmentIdsFromHtmlArea(htmlArea)];
    }, []);

    const fragmentIdsFromComponents = htmlAreaComponentPaths.reduce(
        (fragmentIdsAcc, componentPath) => {
            const fragmentIds = forceArray(contentNode.components).reduce((acc, component) => {
                const htmlArea = getNestedValue(component, componentPath);
                return [...acc, ...getFragmentIdsFromHtmlArea(htmlArea)];
            }, []);

            return [...fragmentIdsAcc, ...fragmentIds];
        },
        []
    );

    return [...fragmentIdsFromData, ...fragmentIdsFromComponents];
};

const getFragmentIdsFromContent = (contentRef, branch) => {
    const fragmentIdsFromMacros = getFragmentIdsFromMacros(contentRef, branch);
    const fragmentIdsFromComponents = getFragmentIdsFromComponents(contentRef, branch);

    return removeDuplicates([...fragmentIdsFromMacros, ...fragmentIdsFromComponents]);
};

// Returns the most recent modifiedTime value, taking into account both the content
// itself and any fragments used in the content
const getModifiedTimeIncludingFragments = (contentRef, branch) => {
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
};

module.exports = {
    getModifiedTimeIncludingFragments,
};
