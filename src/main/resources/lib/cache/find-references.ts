import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { stringArrayToSet } from '../utils/array-utils';
import { runInContext } from '../context/run-in-context';
import {
    typesWithDeepReferences as _typesWithDeepReferences,
    contentTypesWithProductDetails,
} from '../contenttype-lists';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import { getParentPath } from '../paths/path-utils';
import { getAudience } from '../utils/audience';
import { batchedContentQuery } from '../utils/batched-query';

type ReferencesMap = Record<string, Content>;

const MAX_DEPTH = 5;

const typesWithDeepReferences = stringArrayToSet(_typesWithDeepReferences);
const typesWithOverviewPages = stringArrayToSet(contentTypesWithProductDetails);

type ContentWithOverviewPages = Content<(typeof contentTypesWithProductDetails)[number]>;

const isTypeWithOverviewPages = (content: Content): content is ContentWithOverviewPages =>
    typesWithOverviewPages[content.type];

// Search html-area fields for a content id. Handles references via macros, which does not generate
// explicit references
const getStringTypeReferences = (content: Content) => {
    const references = batchedContentQuery({
        start: 0,
        count: 10000,
        query: `fulltext('*', '"${content._id}"')`,
    }).hits;

    logger.info(
        `Found ${references.length} pages with htmlarea-references to content id ${content._id}`
    );

    return references;
};

// Overview pages are generated from meta-data of certain content types, and does not generate
// references to the listed content
const getOverviewReferences = (content: Content) => {
    if (!isTypeWithOverviewPages(content)) {
        return [];
    }

    const { language, data } = content;

    const selectedAudience = getAudience(data.audience);

    const relevantOverviewPages = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:overview', 'no.nav.navno:forms-overview'],
        filters: {
            boolean: {
                should: [
                    {
                        hasValue: {
                            field: 'data.audience',
                            values: [selectedAudience],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data.audience._selected',
                            values: [selectedAudience],
                        },
                    },
                ],
                must: [
                    {
                        hasValue: {
                            field: 'language',
                            values: [language],
                        },
                    },
                ],
            },
        },
    }).hits;

    logger.info(`Found ${relevantOverviewPages.length} relevant overview pages`);

    return relevantOverviewPages;
};

const getFormDetailsReferences = (content: Content) => {
    if (content.type !== 'no.nav.navno:form-details') {
        return [];
    }

    const relevantFormsOverviewPages = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:forms-overview'],
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'language',
                            values: [content.language],
                        },
                    },
                ],
            },
        },
    }).hits;

    logger.info(`Found ${relevantFormsOverviewPages.length} relevant forms overview pages`);

    return relevantFormsOverviewPages;
};

// Editorial pages are merged into office-branch-pages, which in turn is cached.
// Therefore, any changes to a editorial page must invalidate all office-branch-page cache.
const getOfficeBranchPagesIfEditorial = (content: Content) => {
    if (content.type !== 'no.nav.navno:office-editorial-page') {
        return [];
    }

    const { language } = content;

    const officeBranches = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: ['no.nav.navno:office-branch'],
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'language',
                        values: [language],
                    },
                },
            },
        },
    }).hits;

    return officeBranches;
};

// Contact-option parts for chat which does not have a sharedContactInformation field set will have
// a default option set via graphql schema creation callback.
const getChatContactInfoReferences = (content: Content) => {
    if (
        content.type !== 'no.nav.navno:contact-information' ||
        content.data.contactType._selected !== 'chat'
    ) {
        return [];
    }

    const pagesWithDefaultChatInfo = contentLib.query({
        start: 0,
        count: 1000,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'components.part.config.no-nav-navno.contact-option.contactOptions._selected',
                            values: ['chat'],
                        },
                    },
                    {
                        hasValue: {
                            field: 'language',
                            values: [content.language],
                        },
                    },
                    {
                        notExists: {
                            field: 'components.part.config.no-nav-navno.contact-option.contactOptions.chat.sharedContactInformation',
                        },
                    },
                ],
            },
        },
    }).hits;

    logger.info(
        `Found ${pagesWithDefaultChatInfo.length} references for chat contact info ${content._path}`
    );

    return pagesWithDefaultChatInfo;
};

// Some content relations are not defined through explicit references in XP. This includes references
// from macros. We must use our own implementations to find such references.
const getCustomReferences = (content: Content | null) => {
    if (!content) {
        return [];
    }

    return [
        ...getStringTypeReferences(content),
        ...getOverviewReferences(content),
        ...getFormDetailsReferences(content),
        ...getOfficeBranchPagesIfEditorial(content),
        ...getChatContactInfoReferences(content),
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

const getReferences = (id: string, branch: RepoBranch) => {
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

    return chapterRefs.length === 0 ? refs : [...refs, ...chapterRefs];
};

const _findReferences = ({
    id,
    branch,
    references = {},
    referencesChecked = {},
    withDeepSearch = true,
    depth = 0,
    deadline,
}: {
    id: string;
    branch: RepoBranch;
    references?: ReferencesMap;
    referencesChecked?: Record<string, true>;
    withDeepSearch?: boolean;
    depth?: number;
    deadline?: number;
}): Content[] | null => {
    if (deadline && Date.now() > deadline) {
        return null;
    }

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

    if (withDeepSearch) {
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
                deadline,
            });
        });
    }

    if (deadline && Date.now() > deadline) {
        return null;
    }

    return Object.values(references);
};

// Returns null if the search goes past the deadline timestamp
export const findReferences = ({
    id,
    branch,
    deadline,
    withDeepSearch,
}: {
    id: string;
    branch: RepoBranch;
    deadline?: number;
    withDeepSearch?: boolean;
}) => {
    const start = Date.now();

    const references = _findReferences({
        id,
        branch,
        withDeepSearch: false,
    });

    if (!references) {
        logger.warning(`Reference search for ${id} timed out`);
        return null;
    }

    logger.info(
        `Found ${references.length} references for ${id} - time spent: ${
            Math.floor(Date.now() - start) / 1000
        }`
    );

    return references;
};
