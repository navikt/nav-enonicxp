const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');
const { globalValuesContentType } = require('/lib/global-values/global-values');

function getFragmentMacroReferences(content) {
    if (content.type !== 'portal:fragment') {
        return;
    }

    const { _id } = content;

    const contentsWithFragmentId = findContentsWithFragmentMacro(_id);
    if (!contentsWithFragmentId?.length > 0) {
        return;
    }

    log.info(
        `Found ${contentsWithFragmentId.length} cached pages with references to fragment id ${_id}`
    );

    return contentsWithFragmentId;
}

const productCardTargetTypes = {
    [`${app.name}:content-page-with-sidemenus`]: true,
    [`${app.name}:situation-page`]: true,
    [`${app.name}:tools-page`]: true,
};

function clearProductCardMacroReferences(content) {
    if (!productCardTargetTypes[content.type]) {
        return;
    }

    const { _id } = content;

    const contentsWithProductCardMacro = findContentsWithProductCardMacro(_id);
    if (!contentsWithProductCardMacro?.length > 0) {
        return;
    }

    log.info(
        `Wiping ${contentsWithProductCardMacro.length} cached pages with references to product page ${_id}`
    );

    contentsWithProductCardMacro.forEach((contentWithMacro) =>
        wipeOnChange(contentWithMacro._path)
    );
}

const getGlobalValueReferences = (content) => {
    if (content.type !== globalValuesContentType) {
        return;
    }

    return forceArray(content.data?.valueItems).flatMap((item) => {
        getGlobalValueUsage(item.key, content._id);
    });
};

const findMacroReferences = (id, branch) => {
    const content = runInBranchContext(() => contentLib.get({ key: id }), branch);

    if (!content) {
        return [];
    }
};

module.exports = { findMacroReferences };
