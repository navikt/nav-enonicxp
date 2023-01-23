import contentLib, { Content } from '/lib/xp/content';
import { findContentsWithHtmlAreaText } from '../utils/htmlarea-utils';
import { getGlobalValueUsage } from '../global-values/global-value-utils';
import {
    forceArray,
    getParentPath,
    removeDuplicates as _removeDuplicates,
    stringArrayToSet,
} from '../utils/nav-utils';
import { runInBranchContext } from '../context/branches';
import {
    typesWithDeepReferences as _typesWithDeepReferences,
    contentTypesWithProductDetails,
} from '../contenttype-lists';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import { isGlobalValueSetType } from '../global-values/types';
import { getProductDetailsUsage } from '../product-utils/productDetails';

const MAX_DEPTH = 5;

const typesWithDeepReferences = stringArrayToSet(_typesWithDeepReferences);
const typesWithOverviewPages = stringArrayToSet(contentTypesWithProductDetails);

const removeDuplicates = (contentArray: Content[], prevRefs: Content[]) =>
    _removeDuplicates(contentArray, (a, b) => a._id === b._id).filter(
        (ref) => !prevRefs.some((prevRef) => prevRef._id === ref._id)
    );

const getHtmlAreaReferences = (content: Content) => {
    const { _id } = content;

    const references = findContentsWithHtmlAreaText(_id);

    logger.info(`Found ${references.length} pages with htmlarea-references to content id ${_id}`);

    return references;
};

const getGlobalValueReferences = (content: Content) => {
    if (!isGlobalValueSetType(content)) {
        return [];
    }

    const references = forceArray(content.data?.valueItems)
        .map((item) => {
            return getGlobalValueUsage(item.key, content._id);
        })
        .flat();

    logger.info(
        `Found ${references.length} pages with references to global value id ${content._id}`
    );

    return references;
};

const getOverviewReferences = (content: Content) => {
    if (!typesWithOverviewPages[content.type]) {
        return [];
    }

    const overviewPages = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:overview'],
    }).hits;

    return overviewPages;
};

const getProductDetailsReferences = (content: Content) => {
    if (content.type !== 'no.nav.navno:product-details') {
        return [];
    }

    const references = getProductDetailsUsage(content);

    logger.info(
        `Found ${references.length} pages with references to product details id ${content._id}`
    );

    return references;
};

// AreaPage references to Situation pages are set programatically, which does
// not seem to generate dependencies in XP. We need to handle this ourselves.
const getSituationAreaPageReferences = (content: Content) => {
    if (content.type !== 'no.nav.navno:situation-page') {
        return [];
    }

    const areaPages = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:area-page'],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.area',
                        values: forceArray(content.data.area),
                    },
                },
            },
        },
    }).hits;

    return areaPages;
};

// Some content relations are not defined through explicit references in XP. This includes references
// from macros. We must use our own implementations to find such references.
const getCustomReferences = (content: Content | null) => {
    if (!content) {
        return [];
    }

    return [
        ...getHtmlAreaReferences(content),
        ...getGlobalValueReferences(content),
        ...getOverviewReferences(content),
        ...getProductDetailsReferences(content),
        ...getSituationAreaPageReferences(content),
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

    logger.info(`Found ${references.length} pages with direct references to content id ${id}`);

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

    if (parent.type === 'no.nav.navno:publishing-calendar') {
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

const getReferences = (id: string, branch: RepoBranch, prevReferences: Content[]) => {
    const content = runInBranchContext(() => contentLib.get({ key: id }), branch);

    if (!content) {
        return getExplicitReferences(id);
    }

    const refs = removeDuplicates(
        [
            ...getExplicitReferences(id),
            ...getCustomReferences(content),
            ...getReferencesFromParent(content),
        ],
        prevReferences
    );

    // Handle main-article-chapter references. There is a unique system of relations between
    // articles/chapters which is most effectively handled as a separate step.
    const chapterRefs = [...refs, content].reduce((acc, ref) => {
        if (ref.type !== 'no.nav.navno:main-article') {
            return acc;
        }

        return [...acc, ...getMainArticleChapterReferences(ref)];
    }, [] as Content[]);

    return removeDuplicates([...refs, ...chapterRefs], prevReferences);
};

const _findReferences = ({
    id,
    branch,
    prevReferences,
    depth = 0,
}: {
    id: string;
    branch: RepoBranch;
    prevReferences: Content[];
    depth?: number;
}): Content[] => {
    if (depth > MAX_DEPTH) {
        logger.critical(`Reached max depth for references search on id ${id}`);
        return [];
    }

    const references = getReferences(id, branch, prevReferences);

    const _prevReferences = [...references, ...prevReferences];

    const deepReferences = references.reduce((acc, ref) => {
        if (!typesWithDeepReferences[ref.type]) {
            return acc;
        }

        return [
            ...acc,
            ..._findReferences({
                id: ref._id,
                branch: 'master',
                depth: depth + 1,
                prevReferences: _prevReferences,
            }),
        ];
    }, [] as Content[]);

    return removeDuplicates([...references, ...deepReferences], prevReferences);
};

export const findReferences = (id: string, branch: RepoBranch) => {
    const content = runInBranchContext(() => contentLib.get({ key: id }), branch);
    const initialRefs = content ? [content] : [];

    return _findReferences({ id, branch, prevReferences: initialRefs });
};
