const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getParentPath } = require('/lib/nav-utils');
const { removeDuplicates } = require('/lib/nav-utils');
const { findContentsWithFragmentMacro } = require('/lib/htmlarea/htmlarea');
const { findContentsWithProductCardMacro } = require('/lib/htmlarea/htmlarea');
const { getGlobalValueUsage } = require('/lib/global-values/global-values');
const { forceArray } = require('/lib/nav-utils');
const { globalValuesContentType } = require('/lib/global-values/global-values');

const MAX_DEPTH = 5;

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

    log.info(
        `Found ${contentsWithFragmentId.length} pages with macro-references to fragment id ${_id}`
    );

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

// "References" from macros and global value keys does not create explicit references in the content
// structure. We must use our own implementations to find such references.
const getIndirectReferences = (content) => {
    if (!content) {
        return [];
    }

    return [
        ...getGlobalValueReferences(content),
        ...getProductCardMacroReferences(content),
        ...getFragmentMacroReferences(content),
    ];
};

const getExplicitReferences = (id) => {
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

// Handles types which generates content from their children without explicit references
const getReferencesFromParent = (content) => {
    if (!content) {
        return [];
    }

    const { _path, type } = content;

    const parent = contentLib.get({ key: getParentPath(_path) });

    if (!parent) {
        return [];
    }

    if (parent.type === `${app.name}:publishing-calendar`) {
        return [parent];
    }

    if (type === `${app.name}:main-article-chapter` && parent.type === `${app.name}:main-article`) {
        return [parent, ...getMainArticleChapterReferences(parent)];
    }

    return [];
};

// Chapters are attached to an article only via the parent/children relation, not with explicit
// content references. Find any chapters which references the article, as well as the articles
// child chapters and their references articles
const getMainArticleChapterReferences = (mainArticleContent) => {
    const { _id } = mainArticleContent;

    const referencedChapters = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: [`${app.name}:main-article-chapter`],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.article',
                        values: [_id],
                    },
                },
            },
        },
    }).hits;

    const childChapters = contentLib
        .getChildren({ key: _id })
        .hits.filter((child) => child.type === `${app.name}:main-article-chapter`);

    const childChapterArticles = childChapters.reduce((acc, chapter) => {
        const article = contentLib.get({ key: chapter.data.article });
        return article ? [...acc, article] : acc;
    }, []);

    return [...referencedChapters, ...childChapters, ...childChapterArticles];
};

const removeDuplicatesById = (array) => removeDuplicates(array, (a, b) => a._id === b._id);

const findReferences = ({ id, eventType, depth = 0, prevReferences = [] }) => {
    if (depth > MAX_DEPTH) {
        log.info(`Reached max reference depth of ${MAX_DEPTH} while searching from id ${id}`);
        return [];
    }

    // If the root content of the reference-tree was deleted, we must check in the draft branch
    // for the content data used to find indirect references (as the master is presumable deleted!) .
    // For deep references we always use master.
    const content = runInBranchContext(
        () => contentLib.get({ key: id }),
        eventType === 'deleted' ? 'draft' : 'master'
    );

    const references = removeDuplicatesById(
        [
            ...getExplicitReferences(id),
            ...getIndirectReferences(content),
            ...getReferencesFromParent(content),
        ]
            .reduce((acc, reference) => {
                // Handle main-article-chapter references. There is a unique system of relations between
                // articles/chapters which is most reliably handled as a separate step.
                return [
                    reference,
                    ...acc,
                    ...(reference.type === `${app.name}:main-article`
                        ? getMainArticleChapterReferences(reference)
                        : []),
                ];
            }, [])
            .filter(
                (reference) =>
                    // don't include the root content as a reference (may happen in some cases with indirect circular references
                    reference._id !== id &&
                    // discard any references that were previously found, in order to prevent circular reference searches
                    !prevReferences.some((prevReference) => prevReference._id === reference._id)
            )
    );

    const deepReferences = references.reduce((acc, reference) => {
        if (!typesWithDeepReferences[reference.type]) {
            return acc;
        }

        return [
            ...acc,
            ...findReferences({
                id: reference._id,
                depth: depth + 1,
                prevReferences: [...references, ...prevReferences],
            }),
        ];
    }, []);

    return removeDuplicatesById([...references, ...deepReferences]);
};

module.exports = { findReferences };
