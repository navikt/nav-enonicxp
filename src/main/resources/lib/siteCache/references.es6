const contentLib = require('/lib/xp/content');
const { getParentPath } = require('/lib/nav-utils');
const { removeDuplicates } = require('/lib/nav-utils');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');
const { findContentsWithProductCardMacro } = require('/lib/htmlarea/htmlarea');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');
const { globalValuesContentType } = require('/lib/global-values/global-values');

const MAX_DEPTH = 3;

const typesWithContentGeneratedFromChildren = {
    [`${app.name}:main-article`]: true,
    [`${app.name}:publishing-calendar`]: true,
};

const productCardTargetTypes = {
    [`${app.name}:content-page-with-sidemenus`]: true,
    [`${app.name}:situation-page`]: true,
    [`${app.name}:tools-page`]: true,
};

const getFragmentMacroReferences = (content) => {
    if (content.type !== 'portal:fragment') {
        return [];
    }

    const { _id } = content;

    const contentsWithFragmentId = findContentsWithFragmentMacro(_id);
    if (!contentsWithFragmentId?.length > 0) {
        return [];
    }

    log.info(`Found ${contentsWithFragmentId.length} pages with references to fragment id ${_id}`);

    return contentsWithFragmentId;
};

const getProductCardMacroReferences = (content) => {
    if (!productCardTargetTypes[content.type]) {
        return [];
    }

    const { _id } = content;

    const references = findContentsWithProductCardMacro(_id);

    log.info(`Found ${references.length} pages with macro-references to product page id ${_id}`);

    return references;
};

const getGlobalValueReferences = (content) => {
    if (content.type !== globalValuesContentType) {
        return [];
    }

    const references = forceArray(content.data?.valueItems)
        .map((item) => {
            return getGlobalValueUsage(item.key, content._id);
        })
        .flat();

    log.info(`Found ${references.length} pages with references to global value id ${content._id}`);

    return references;
};

const getMacroReferences = (id) => {
    const content = contentLib.get({ key: id });

    if (!content) {
        return [];
    }

    return [
        ...getGlobalValueReferences(content),
        ...getProductCardMacroReferences(content),
        ...getFragmentMacroReferences(content),
    ];
};

const getContentReferences = (id) => {
    const references = contentLib.query({
        start: 0,
        count: 1000,
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

    if (parent && typesWithContentGeneratedFromChildren[parent.type]) {
        return [parent];
    }

    return [];
};

// If the parent is a main-article, we need to wipe this article, any chapters under that article
// and the articles referenced by those chapters. Chapters are attached to an article only via
// the parent/children relation, not with an explicit content reference
const addMainArticleChapterReferences = (prevAcc, content, _, initialArray) => {
    const acc = prevAcc?.length > 0 ? prevAcc : initialArray;

    if (content.type === `${app.name}:main-article`) {
        const chapters = contentLib
            .getChildren({ key: content._id })
            .hits.filter((child) => child.type === `${app.name}:main-article-chapter`);

        if (chapters.length > 0) {
            const chapterArticles = chapters.map((chapter) =>
                contentLib.get({ key: chapter.data.article })
            );

            return [...acc, ...chapters, ...chapterArticles];
        }
    }

    return acc;
};

const findReferences = (id, path, depth = 0) => {
    if (depth > MAX_DEPTH) {
        log.info(`Reached max reference depth of ${MAX_DEPTH}`);
        return [];
    }

    // If the path was retrieved from a nodelib query, it will have the "/content" prefix
    const contentPath = path.replace(/^\/content/, '');

    const references = [
        ...getContentReferences(id),
        ...getMacroReferences(id),
        ...getReferencesFromParent(contentPath),
    ]
        .reduce(addMainArticleChapterReferences, [])
        .filter((content) => content._id !== id);

    const deepReferences = references
        .map((reference) => findReferences(reference._id, reference._path, depth + 1))
        .flat();

    return removeDuplicates([...references, ...deepReferences], (a, b) => a._id === b._id);
};

module.exports = { findReferences };
