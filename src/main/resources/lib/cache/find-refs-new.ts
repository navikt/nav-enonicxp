import { Content, BooleanFilter } from '/lib/xp/content';
import { RepoConnection, NodeQueryHit, RepoNode } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import {
    contentTypesInFormsOverviewPages,
    contentTypesInOverviewPages,
    contentTypesWithDeepReferences,
} from '../contenttype-lists';
import { getRepoConnection } from '../utils/repo-utils';
import { APP_DESCRIPTOR } from '../constants';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { getParentPath } from '../paths/path-utils';
import { NON_LOCALIZED_QUERY_FILTER } from '../localization/locale-utils';
import { forceArray } from '../utils/array-utils';

type ConstructorParams = {
    baseContentId: string;
    repoId: string;
    branch: RepoBranch;
    withDeepSearch?: boolean;
};

type ContentDescriptorSet = ReadonlySet<ContentDescriptor>;
type ContentNode = RepoNode<Content<any>>;

type NodeQueryHitId = Pick<NodeQueryHit, 'id'>;
type ReferenceSearchResult = ReadonlyArray<NodeQueryHitId>;

const typesWithDeepReferences: ContentDescriptorSet = new Set(contentTypesWithDeepReferences);
const typesWithOverviewPages: ContentDescriptorSet = new Set([
    ...contentTypesInOverviewPages,
    `${APP_DESCRIPTOR}:product-details`,
]);
const typesWithFormsOverviewPages: ContentDescriptorSet = new Set([
    ...contentTypesInFormsOverviewPages,
    `${APP_DESCRIPTOR}:form-details`,
]);

export class ContentReferenceFinder {
    private readonly baseContentId: string;
    private readonly branch: RepoBranch;
    private readonly withDeepSearch: boolean;

    private readonly repoConnection: RepoConnection;

    private referencesFound: Record<string, Content>;
    private referencesChecked: Set<string>;

    constructor({ baseContentId, repoId, branch, withDeepSearch }: ConstructorParams) {
        this.baseContentId = baseContentId;
        this.branch = branch;
        this.withDeepSearch = !!withDeepSearch;

        this.referencesFound = {};
        this.referencesChecked = new Set();

        this.repoConnection = getRepoConnection({
            branch,
            repoId,
            asAdmin: true,
        });
    }

    public run(): Content[] {
        this.reset();
        this.findReferences(this.baseContentId);

        return Object.values(this.referencesFound);
    }

    private reset() {
        this.referencesFound = {};
        this.referencesChecked.clear();
    }

    private contentNodeQuery = ({
        filters,
        query,
    }: {
        filters?: BooleanFilter;
        query?: string;
    }) => {
        const result = this.repoConnection.query({
            start: 0,
            count: 1000,
            query: `_path NOT LIKE "/archive/*"${query ? ` AND (${query})` : ''}`,
            filters: {
                ...filters,
                boolean: {
                    ...filters?.boolean,
                    mustNot: [
                        ...forceArray(filters?.boolean?.mustNot),
                        ...NON_LOCALIZED_QUERY_FILTER,
                    ],
                    must: [
                        ...forceArray(filters?.boolean?.must),
                        {
                            hasValue: {
                                field: '_nodeType',
                                values: ['content'],
                            },
                        },
                    ],
                },
            },
        }).hits;

        return result;
    };

    private findReferences(contentId: string) {
        if (this.referencesChecked.has(contentId)) {
            return;
        }

        this.referencesChecked.add(contentId);

        this.findExplicitRefs(contentId).forEach(this.processReference, this);
        this.findTextRefs(contentId).forEach(this.processReference, this);

        const content = this.repoConnection.get<Content>(contentId);
        if (!content) {
            return;
        }

        this.findOverviewRefs(content).forEach(this.processReference, this);
        this.findFormsOverviewRefs(content).forEach(this.processReference, this);
        this.findOfficeBranchRefs(content).forEach(this.processReference, this);
        this.findContactInfoRefs(content).forEach(this.processReference, this);
        this.findMainArticleChapterRefs(content).forEach(this.processReference, this);
        this.findParentRefs(content).forEach(this.processReference, this);
    }

    private processReference(nodeQueryHitId: NodeQueryHitId) {
        const { id } = nodeQueryHitId;

        if (this.referencesFound[id]) {
            return;
        }

        const content = this.repoConnection.get<Content>(id);
        if (!content) {
            return;
        }

        this.referencesFound[id] = content;

        if (this.withDeepSearch && typesWithDeepReferences.has(content.type)) {
            this.findReferences(id);
        }
    }

    private findExplicitRefs(contentId: string): ReferenceSearchResult {
        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: '_references',
                            values: [contentId],
                        },
                    },
                },
            },
        });

        logger.info(`Found ${result.length} contents with explicit references to "${contentId}"`);

        return result;
    }

    private findTextRefs(contentId: string): ReferenceSearchResult {
        const result = this.contentNodeQuery({
            query: `fulltext('_allText', '"${contentId}"')`,
        });

        logger.info(`Found ${result.length} contents with text references to "${contentId}"`);

        return result;
    }

    // Overview pages are generated from meta-data of certain content types, and does not generate
    // references to the listed content
    private findOverviewRefs(content: ContentNode): ReferenceSearchResult {
        if (!typesWithOverviewPages.has(content.type)) {
            return [];
        }

        const { language, data } = content;

        const selectedAudience = data?.audience?._selected;
        if (!selectedAudience) {
            return [];
        }

        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'type',
                                values: ['no.nav.navno:overview'],
                            },
                        },
                        {
                            hasValue: {
                                field: 'language',
                                values: [language],
                            },
                        },
                        {
                            hasValue: {
                                field: 'data.audience',
                                values: [selectedAudience],
                            },
                        },
                    ],
                },
            },
        });

        logger.info(`Found ${result.length} relevant overview pages`);

        return result;
    }

    private findFormsOverviewRefs(content: ContentNode): ReferenceSearchResult {
        if (!typesWithFormsOverviewPages.has(content.type)) {
            return [];
        }

        const { language, data } = content;

        const selectedAudience = data?.audience?._selected;
        if (!selectedAudience) {
            return [];
        }

        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'type',
                                values: ['no.nav.navno:forms-overview'],
                            },
                        },
                        {
                            hasValue: {
                                field: 'language',
                                values: [language],
                            },
                        },
                        {
                            hasValue: {
                                field: 'data.audience._selected',
                                values: [selectedAudience],
                            },
                        },
                    ],
                },
            },
        });

        logger.info(`Found ${result.length} relevant forms overview pages`);

        return result;
    }

    // Editorial pages are merged into office-branch-pages, which in turn is cached.
    // Therefore, any changes to a editorial page must invalidate all office-branch-page cache.
    private findOfficeBranchRefs(content: ContentNode): ReferenceSearchResult {
        if (content.type !== 'no.nav.navno:office-editorial-page') {
            return [];
        }

        const { language } = content;

        const officeBranches = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'language',
                                values: [language],
                            },
                        },
                        {
                            hasValue: {
                                field: 'type',
                                values: ['no.nav.navno:office-branch'],
                            },
                        },
                    ],
                },
            },
        });

        return officeBranches;
    }

    // Contact-option parts for chat which does not have a sharedContactInformation field set will have
    // a default option set via graphql schema creation callback.
    private findContactInfoRefs(content: ContentNode): ReferenceSearchResult {
        if (
            content.type !== 'no.nav.navno:contact-information' ||
            content.data.contactType._selected !== 'chat'
        ) {
            return [];
        }

        const result = this.contentNodeQuery({
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
        });

        logger.info(`Found ${result.length} references for chat contact info ${content._path}`);

        return result;
    }

    // Handle content types which generates content from their parent, without explicit references
    private findParentRefs(content: ContentNode): ReferenceSearchResult {
        const { _path, type } = content;

        const parentContentNode = this.repoConnection.get<Content>({ key: getParentPath(_path) });
        if (!parentContentNode) {
            return [];
        }

        const parentIdHit = { id: parentContentNode._id };

        if (parentContentNode.type === 'no.nav.navno:publishing-calendar') {
            return [parentIdHit];
        }

        if (type === 'no.nav.navno:main-article-chapter') {
            return [parentIdHit, ...this.findMainArticleChapterRefs(parentContentNode)];
        }

        return [];
    }

    // Chapters are attached to an article only via the parent/children relation, not with explicit
    // content references.
    private findMainArticleChapterRefs(content: ContentNode): ReferenceSearchResult {
        if (content.type !== 'no.nav.navno:main-article') {
            return [];
        }

        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: '_parentPath',
                                values: [content._path],
                            },
                        },
                        {
                            hasValue: {
                                field: 'type',
                                values: ['no.nav.navno:main-article-chapter'],
                            },
                        },
                    ],
                },
            },
        });

        return result;
    }
}
