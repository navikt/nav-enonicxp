const contentLib = require('/lib/xp/content');
const { getParentPath } = require('/lib/nav-utils');
const { removeDuplicates } = require('/lib/nav-utils');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');
const { findContentsWithProductCardMacro } = require('/lib/htmlarea/htmlarea');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');
const { globalValuesContentType } = require('/lib/global-values/global-values');

const mainArticleType = `${app.name}:main-article`;
const mainArticleChapterType = `${app.name}:main-article-chapter`;
const publishingCalendarType = `${app.name}:publishing-calendar`;

const productCardTargetTypes = {
    [`${app.name}:content-page-with-sidemenus`]: true,
    [`${app.name}:situation-page`]: true,
    [`${app.name}:tools-page`]: true,
};

const typesWithReferenceFromParent = {
    [`${app.name}:notification`]: true,
};

const getFragmentMacroReferences = (content) => {
    if (content.type !== 'portal:fragment') {
        return;
    }

    const { _id } = content;

    const contentsWithFragmentId = findContentsWithFragmentMacro(_id);
    if (!contentsWithFragmentId?.length > 0) {
        return;
    }

    log.info(`Found ${contentsWithFragmentId.length} pages with references to fragment id ${_id}`);

    return contentsWithFragmentId;
};

const getProductCardMacroReferences = (content) => {
    if (!productCardTargetTypes[content.type]) {
        return;
    }

    const { _id } = content;

    const references = findContentsWithProductCardMacro(_id);

    log.info(`Found ${references.length} pages with macro-references to product page id ${_id}`);

    return references;
};

const getGlobalValueReferences = (content) => {
    if (content.type !== globalValuesContentType) {
        return;
    }

    const references = forceArray(content.data?.valueItems)
        .map((item) => {
            getGlobalValueUsage(item.key, content._id);
        })
        .flat();

    log.info(`Found ${references.length} pages with references to global value id ${_id}`);

    return references;
};

const getMacroReferences = (id, branch) => {
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

const getDirectReferences = (id) => {
    const references = contentLib.query({
        start: 0,
        count: 2,
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: '_references',
                        values: [id],
                    },
                },
            },
        },
    }).hits;

    log.info(`Found ${references.length} pages with direct references to content id ${id}`);

    return references;
};

const getReferencesFromParent = (path) => {
    const parent = contentLib.get({ key: getParentPath(path) });

    if (!parent) {
        return [];
    }

    const { type } = parent;

    if (type === mainArticleType) {
        const chapters = contentLib
            .getChildren({ key: content._id })
            .hits.filter((child) => child.type === mainArticleChapterType);

        return [parent, ...chapters];
    }

    if (type === publishingCalendarType) {
        return [parent];
    }

    return [];
};

const findReferences = (id, nodePath, branch) => {
    const contentPath = nodePath.replace(/^\/content/, '');

    // Do not include the source content id
    const references = [
        ...getDirectReferences(id, branch),
        ...getMacroReferences(id, branch),
        ...getReferencesFromParent(contentPath),
    ].filter((content) => content.id !== id);

    return removeDuplicates(references, (a, b) => a._path === b._path);
};

module.exports = { findReferences };
