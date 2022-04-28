import contentLib, { Content } from '/lib/xp/content';
import {
    findContentsWithFragmentMacro,
    findContentsWithProductCardMacro,
} from '../utils/htmlarea-utils';
import { getGlobalValueUsage, globalValuesContentType } from '../utils/global-value-utils';
import { forceArray, getParentPath, removeDuplicates, stringArrayToSet } from '../utils/nav-utils';
import { runInBranchContext } from '../utils/branch-context';
import {
    productPageContentTypes,
    typesWithDeepReferences as _typesWithDeepReferences,
} from '../contenttype-lists';
import { RepoBranch } from '../../types/common';

const productCardTargetTypes = stringArrayToSet(productPageContentTypes);
const typesWithDeepReferences = stringArrayToSet(_typesWithDeepReferences);

const removeDuplicatesById = (contentArray: Content[]) =>
    removeDuplicates(contentArray, (a, b) => a._id === b._id);

const getFragmentMacroReferences = (content: Content) => {
    if (content.type !== 'portal:fragment') {
        return [];
    }

    const { _id } = content;

    const contentsWithFragmentId = findContentsWithFragmentMacro(_id);
    if (contentsWithFragmentId.length > 0) {
        log.info(
            `Found ${contentsWithFragmentId.length} pages with macro-references to fragment id ${_id}`
        );
    }

    return contentsWithFragmentId;
};

const getProductCardMacroReferences = (content: Content) => {
    if (!productCardTargetTypes[content.type]) {
        return [];
    }

    const { _id } = content;

    const references = findContentsWithProductCardMacro(_id);

    log.info(`Found ${references.length} pages with macro-references to product page id ${_id}`);

    return references;
};

const getGlobalValueReferences = (content: Content) => {
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
const getLooseReferences = (content: Content | null) => {
    if (!content) {
        return [];
    }

    return [
        ...getGlobalValueReferences(content),
        ...getProductCardMacroReferences(content),
        ...getFragmentMacroReferences(content),
    ];
};

const getExplicitReferences = (id: string) => {
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
const getReferencesFromParent = (content: Content | null) => {
    if (!content) {
        return [];
    }

    const { _path, type } = content;

    const parent = contentLib.get({ key: getParentPath(_path) });

    if (!parent) {
        return [];
    }

    if (
        content.type === 'no.nav.navno:notification' ||
        parent.type === 'no.nav.navno:publishing-calendar'
    ) {
        return [parent];
    }

    if (
        type === 'no.nav.navno:main-article-chapter' &&
        parent.type === 'no.nav.navno:main-article'
    ) {
        return [parent, ...getMainArticleChapterReferences(parent)];
    }

    return [];
};

// Chapters are attached to an article only via the parent/children relation, not with explicit
// content references. Find any chapters which references the article, as well as the article's
// child chapters and their references articles
const getMainArticleChapterReferences = (content: Content<'no.nav.navno:main-article'>) => {
    return contentLib.query({
        count: 1000,
        query: `_parentPath='/content${content._path}'`,
        contentTypes: ['no.nav.navno:main-article-chapter'],
    }).hits;
};

const getReferences = (id: string, branch: RepoBranch) => {
    const content = runInBranchContext(() => contentLib.get({ key: id }), branch);

    if (!content) {
        return getExplicitReferences(id);
    }

    const refs = removeDuplicatesById([
        ...getExplicitReferences(id),
        ...getLooseReferences(content),
        ...getReferencesFromParent(content),
    ]);

    // Handle main-article-chapter references. There is a unique system of relations between
    // articles/chapters which is most effectively handled as a separate step.
    const chapterRefs = [...refs, content].reduce((acc, ref) => {
        if (ref.type !== 'no.nav.navno:main-article') {
            return acc;
        }

        return [...acc, ...getMainArticleChapterReferences(ref)];
    }, [] as Content[]);

    return removeDuplicatesById([...refs, ...chapterRefs]);
};

export const findReferences = (id: string, branch: RepoBranch) => {
    const references = getReferences(id, branch);

    const deepReferences = references.reduce((acc, ref) => {
        if (!typesWithDeepReferences[ref.type]) {
            return acc;
        }

        return [...acc, ...getReferences(ref._id, 'master')];
    }, [] as Content[]);

    return removeDuplicatesById([...references, ...deepReferences]);
};
