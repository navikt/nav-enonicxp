const contentLib = require('/lib/xp/content');
const { getParentPath } = require('/lib/nav-utils');
const { removeDuplicates } = require('/lib/nav-utils');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');
const { findContentsWithProductCardMacro } = require('/lib/htmlarea/htmlarea');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');
const { globalValuesContentType } = require('/lib/global-values/global-values');

const MAX_DEPTH = 4;

const typesWithContentGeneratedFromChildren = {
    [`${app.name}:main-article`]: true,
    [`${app.name}:publishing-calendar`]: true,
};

const productCardTargetTypes = {
    [`${app.name}:content-page-with-sidemenus`]: true,
    [`${app.name}:situation-page`]: true,
    [`${app.name}:employer-situation-page`]: true,
    [`${app.name}:tools-page`]: true,
};

const typesWithDeepReferences = {
    'portal:fragment': true,
    [`${app.name}:global-value-set`]: true,
    [`${app.name}:notification`]: true,
    [`${app.name}:main-article-chapter`]: true,
    [`${app.name}:content-list`]: true,
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
const getMainArticleChapterReferences = (content) => {
    if (content.type !== `${app.name}:main-article`) {
        return [];
    }

    const chapters = contentLib
        .getChildren({ key: content._id })
        .hits.filter((child) => child.type === `${app.name}:main-article-chapter`);

    if (chapters.length === 0) {
        return [];
    }

    const chapterArticles = chapters
        .map((chapter) => contentLib.get({ key: chapter.data.article }))
        .filter(Boolean);

    return [...chapters, ...chapterArticles];
};

const removeDuplicatesById = (array) => removeDuplicates(array, (a, b) => a._id === b._id);

const findReferences = (id, path, depth = 0) => {
    if (depth > MAX_DEPTH) {
        log.info(`Reached max reference depth of ${MAX_DEPTH}`);
        return [];
    }

    // If the path was retrieved from a nodelib query, it will have the "/content" prefix
    const contentPath = path.replace(/^\/content/, '');

    const references = removeDuplicatesById(
        [
            ...getContentReferences(id),
            ...getMacroReferences(id),
            ...getReferencesFromParent(contentPath),
        ]
            .reduce((acc, content) => {
                const mainArticleChapterReferences = getMainArticleChapterReferences(content);

                return mainArticleChapterReferences.length > 0
                    ? [...acc, ...mainArticleChapterReferences]
                    : acc;
            })
            .filter((content) => content._id !== id)
    );

    const deepReferences = references
        .filter((reference) => typesWithDeepReferences[reference.type])
        .map((reference) => findReferences(reference._id, reference._path, depth + 1))
        .flat();

    return removeDuplicatesById([...references, ...deepReferences]);
};

module.exports = { findReferences };
