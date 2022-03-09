import contentLib, { Content } from '/lib/xp/content';
import {
    findContentsWithFragmentMacro,
    findContentsWithProductCardMacro,
} from '../htmlarea/htmlarea';
import { getGlobalValueUsage, globalValuesContentType } from '../global-values/global-values';
import { forceArray, getParentPath, removeDuplicates } from '../utils/nav-utils';
import { runInBranchContext } from '../utils/branch-context';
import { ContentDescriptor } from 'types/content-types/content-config';

const MAX_DEPTH = 5;

const productCardTargetTypes: { [type in ContentDescriptor]?: boolean } = {
    'no.nav.navno:content-page-with-sidemenus': true,
    'no.nav.navno:situation-page': true,
    'no.nav.navno:tools-page': true,
};

const typesWithDeepReferences: { [type in ContentDescriptor]?: boolean } = {
    'portal:fragment': true,
    'no.nav.navno:global-value-set': true,
    'no.nav.navno:notification': true,
    'no.nav.navno:main-article-chapter': true,
    'no.nav.navno:content-list': true,
};

const getFragmentMacroReferences = (content: Content) => {
    if (content.type !== 'portal:fragment') {
        return [];
    }

    const { _id } = content;

    const contentsWithFragmentId = findContentsWithFragmentMacro(_id);
    if (contentsWithFragmentId.length === 0) {
        return [];
    }

    log.info(
        `Found ${contentsWithFragmentId.length} pages with macro-references to fragment id ${_id}`
    );

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
const getIndirectReferences = (content: Content | null) => {
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
const getMainArticleChapterReferences = (
    mainArticleContent: Content<'no.nav.navno:main-article'>
) => {
    const { _id } = mainArticleContent;

    const referencedChapters = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:main-article-chapter'],
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
        .getChildren({ key: _id, count: 1000 })
        .hits.filter(
            (child) => child.type === 'no.nav.navno:main-article-chapter'
        ) as Content<'no.nav.navno:main-article-chapter'>[];

    const childChapterArticles = childChapters.reduce((acc, chapter) => {
        const article = contentLib.get({ key: chapter.data.article });

        return article?.type === 'no.nav.navno:main-article' ? [...acc, article] : acc;
    }, [] as Content<'no.nav.navno:main-article'>[]);

    return [...referencedChapters, ...childChapters, ...childChapterArticles];
};

const removeDuplicatesById = (contentArray: Content[]) =>
    removeDuplicates(contentArray, (a, b) => a._id === b._id);

// Perform a recursive search of content references
const _findReferences = ({
    id,
    eventType,
    depth = 0,
    prevReferences = [],
}: {
    id: string;
    eventType?: string;
    depth?: number;
    prevReferences?: any[];
}): Content[] => {
    if (depth > MAX_DEPTH) {
        log.warning(`Reached max reference depth of ${MAX_DEPTH} while searching from id ${id}`);
        return [];
    }

    if (!id) {
        return [];
    }

    // If the root content of the reference-tree was deleted, we must check in the draft branch
    // for the content data used to find indirect references (as the master is presumable deleted!) .
    // For deep references we always use master.
    const content = runInBranchContext(
        () => contentLib.get({ key: id }),
        eventType === 'node.deleted' ? 'draft' : 'master'
    );

    const references = removeDuplicatesById(
        [
            ...getExplicitReferences(id),
            ...getIndirectReferences(content),
            ...getReferencesFromParent(content),
        ]
            .reduce((acc, reference) => {
                // Handle main-article-chapter references. There is a unique system of relations between
                // articles/chapters which is most effectively handled as a separate step.
                return [
                    reference,
                    ...acc,
                    ...(reference.type === 'no.nav.navno:main-article'
                        ? getMainArticleChapterReferences(reference)
                        : []),
                ];
            }, [] as Content[])
            .filter(
                (reference) =>
                    // Don't include the root content as a reference (may happen in some cases with indirect circular references
                    reference._id !== id &&
                    // Discard any references that were previously found, in order to prevent circular deep reference searches
                    !prevReferences.some((prevReference) => prevReference._id === reference._id)
            )
    );

    const deepReferences = references.reduce((acc, reference) => {
        if (!typesWithDeepReferences[reference.type]) {
            return acc;
        }

        return [
            ...acc,
            ..._findReferences({
                id: reference._id,
                depth: depth + 1,
                prevReferences: [...references, ...prevReferences],
            }),
        ];
    }, [] as Content[]);

    return removeDuplicatesById([...references, ...deepReferences]);
};

export const findReferences = ({
    id,
    eventType,
}: {
    id: string;
    eventType?: string;
}): Content[] => {
    return _findReferences({ id, eventType });
};
