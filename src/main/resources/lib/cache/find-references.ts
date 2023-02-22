import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { findContentsWithHtmlAreaText } from '../utils/htmlarea-utils';
import { getGlobalValueCalcUsage } from '../global-values/global-value-utils';
import {
    forceArray,
    getParentPath,
    stringArrayToSet,
} from '../utils/nav-utils';
import { runInContext } from '../context/run-in-context';
import {
    typesWithDeepReferences as _typesWithDeepReferences,
    contentTypesWithProductDetails,
} from '../contenttype-lists';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import { isGlobalValueSetType } from '../global-values/types';
import { getProductDetailsUsage } from '../product-utils/productDetails';

type ReferencesMap = Record<string, Content>;

const MAX_DEPTH = 5;

const typesWithDeepReferences = stringArrayToSet(_typesWithDeepReferences);
const typesWithOverviewPages = stringArrayToSet(contentTypesWithProductDetails);

// Search html-area fields for a content id. Handles references via macros, which does not generate
// explicit references
const getHtmlAreaReferences = (content: Content) => {
    const { _id, type } = content;

    // Fragments containing other fragments is a very rare edge-case, which we will ignore
    // for performance reasons until the bug with querying fragment component fields is resolved :D
    const references = findContentsWithHtmlAreaText(_id, type !== 'portal:fragment');

    logger.info(`Found ${references.length} pages with htmlarea-references to content id ${_id}`);

    return references;
};

// Global values used in calculators are selected with a custom selector, and does not generate
// explicit references
const getGlobalValueCalculatorReferences = (content: Content) => {
    if (!isGlobalValueSetType(content)) {
        return [];
    }

    const references = forceArray(content.data?.valueItems)
        .map((item) => {
            return getGlobalValueCalcUsage(item.key);
        })
        .flat();

    logger.info(
        `Found ${references.length} pages with references to global value id ${content._id}`
    );

    return references;
};

// Overview pages are generated from meta-data of certain content types, and does not generate
// references to the listed content
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

// Product details are selected with a custom selector, and does not generate explicit references
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
        ...getGlobalValueCalculatorReferences(content),
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

// Handle types which generates content from their children without explicit references
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

export const getReferences = (id: string, branch: RepoBranch) => {
    const content = runInContext({ branch }, () => contentLib.get({ key: id }));
    if (!content) {
        return getExplicitReferences(id);
    }

    const refs = [
        ...getExplicitReferences(id),
        ...getCustomReferences(content),
        ...getReferencesFromParent(content),
        content,
    ];

    // Handle main-article-chapter references. There is a unique system of relations between
    // articles/chapters which is most effectively handled as a separate step.
    const chapterRefs = refs.reduce((acc, ref) => {
        if (ref.type !== 'no.nav.navno:main-article') {
            return acc;
        }

        return [...acc, ...getMainArticleChapterReferences(ref)];
    }, [] as Content[]);

    return [...refs, ...chapterRefs];
};

const _findReferences = ({
    id,
    branch,
    references = {},
    referencesChecked = {},
    depth = 0,
}: {
    id: string;
    branch: RepoBranch;
    references?: ReferencesMap;
    referencesChecked?: Record<string, true>;
    depth?: number;
}): Content[] => {
    if (referencesChecked[id]) {
        return [];
    }

    referencesChecked[id] = true;

    if (depth > MAX_DEPTH) {
        logger.critical(`Reached max depth for references search on id ${id}`);
        return [];
    }

    const newRefs = getReferences(id, branch);

    newRefs.forEach((refContent) => {
        const { _id } = refContent;
        if (!references[_id]) {
            references[_id] = refContent;
        }
    });

    logger.info(
        `References for ${id}: ${newRefs.length} - Total references so far: ${
            Object.values(references).length
        }`
    );

    newRefs.forEach((refContent) => {
        if (!typesWithDeepReferences[refContent.type]) {
            return;
        }

        _findReferences({
            id: refContent._id,
            branch: 'master',
            depth: depth + 1,
            references,
            referencesChecked,
        });
    });

    return Object.values(references);
};

export const findReferences = (id: string, branch: RepoBranch) => {
    const start = Date.now();

    const references = _findReferences({ id, branch });

    logger.info(
        `Found ${references.length} for ${id} - time spent: ${
            Math.floor(Date.now() - start) / 1000
        }`
    );

    return references;
};
