const contentLib = require('/lib/xp/content');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');
const { findContentsWithProductCardMacro } = require('/lib/htmlarea/htmlarea');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');
const { globalValuesContentType } = require('/lib/global-values/global-values');

const productCardTargetTypes = {
    [`${app.name}:content-page-with-sidemenus`]: true,
    [`${app.name}:situation-page`]: true,
    [`${app.name}:tools-page`]: true,
};

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

function getProductCardMacroReferences(content) {
    if (!productCardTargetTypes[content.type]) {
        return;
    }

    const { _id } = content;

    const references = findContentsWithProductCardMacro(_id);

    log.info(`Found ${references.length} pages with references to product page ${_id}`);

    return references;
}

const getGlobalValueReferences = (content) => {
    if (content.type !== globalValuesContentType) {
        return;
    }

    const references = forceArray(content.data?.valueItems)
        .map((item) => {
            getGlobalValueUsage(item.key, content._id);
        })
        .flat();

    log.info(`Found ${references.length} pages with references to product page ${_id}`);

    return references;
};

const findMacroReferences = (id, branch) => {
    const content = runInBranchContext(() => contentLib.get({ key: id }), branch);

    if (!content) {
        return [];
    }

    return [
        ...getGlobalValueReferences(content),
        ...getProductCardMacroReferences(content),
        ...getFragmentMacroReferences(content),
    ];
};

const findReferences = (id, branch) => {
    return findMacroReferences(id, branch);
};

module.exports = { findReferences };
