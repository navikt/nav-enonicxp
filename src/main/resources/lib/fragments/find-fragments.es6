const nodeLib = require('/lib/xp/node');
const contextLib = require('/lib/xp/context');
const contentLib = require('/lib/xp/content');
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

const getFragmentIdsFromHtmlArea = (htmlArea) => {
    if (!htmlArea) {
        return [];
    }

    const fragmentIds = htmlArea.match(htmlFragmentMacroPattern);

    log.info(`macro fragments: ${JSON.stringify(fragmentIds)}`);

    return fragmentIds ? fragmentIds.map((id) => id.replace(htmlFragmentMacroPrefix, '')) : [];
};

// Gets fragment ids from fragment components
const getFragmentIdsFromComponents = (contentRef, branch) => {
    const contentNode = getContentNode(contentRef, branch);

    if (!contentNode) {
        return null;
    }

    return forceArray(contentNode.components).reduce((fragmentIds, component) => {
        const fragmentId = component.fragment?.id;
        return fragmentId && !fragmentIds.includes(fragmentId)
            ? [...fragmentIds, fragmentId]
            : fragmentIds;
    }, []);
};

// Gets fragment ids referenced from HtmlFragment macros
const getFragmentIdsFromMacros = (contentRef, branch) => {
    const contentNode = getContentNode(contentRef, branch);

    if (!contentNode) {
        return null;
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

    // remove duplicates
    return [...fragmentIdsFromMacros, ...fragmentIdsFromComponents].filter(
        (id, index, arr) => arr.indexOf(id) === index
    );
};

const getModifiedTimeIncludingFragments = (contentRef, branch) => {
    const content = contentLib.get({ key: contentRef });
    const fragmentIds = getFragmentIdsFromContent(contentRef, branch);

    const latestModifiedFragmentTime = fragmentIds.reduce((latestModifiedTime, fragmentId) => {
        const fragment = contentLib.get({ key: fragmentId });
        if (!fragment) {
            log.warning(`No fragment found for id ${fragmentId}`);
            return latestModifiedTime;
        }

        const modifiedTime = fragment.modifiedTime;

        if (!latestModifiedTime) {
            return modifiedTime;
        }

        return getUnixTimeFromDateTimeString(modifiedTime) >
            getUnixTimeFromDateTimeString(latestModifiedTime)
            ? modifiedTime
            : latestModifiedTime;
    }, '');

    if (latestModifiedFragmentTime) {
        const fragmentTimestamp = getUnixTimeFromDateTimeString(latestModifiedFragmentTime);
        const contentTimestamp = getUnixTimeFromDateTimeString(content.modifiedTime);

        if (fragmentTimestamp > contentTimestamp) {
            return latestModifiedFragmentTime;
        }
    }

    return content.modifiedTime;
};

module.exports = {
    getModifiedTimeIncludingFragments,
};
