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

type ContentDescriptorSet = ReadonlySet<ContentDescriptor>;
type ContentNode = RepoNode<Content<any>>;

type QueryHit = Pick<NodeQueryHit, 'id'>;
type QueryResult = ReadonlyArray<QueryHit>;

const QUERY_COUNT = 1000;

const typesWithDeepReferences: ContentDescriptorSet = new Set(contentTypesWithDeepReferences);
const typesWithOverviewPages: ContentDescriptorSet = new Set([
    ...contentTypesInOverviewPages,
    `${APP_DESCRIPTOR}:product-details`,
]);
const typesWithFormsOverviewPages: ContentDescriptorSet = new Set([
    ...contentTypesInFormsOverviewPages,
    `${APP_DESCRIPTOR}:form-details`,
]);

export class ContentReferencesFinder {
    private readonly baseContentId: string;
    private readonly repoId: string;
    private readonly branch: string;
    private readonly withDeepSearch?: boolean;
    private readonly timeout?: number;

    private readonly logSummary: string;
    private readonly repoConnection: RepoConnection;

    private referencesFound: Record<string, Content>;
    private referencesChecked: Set<string>;
    private deadline?: number;

    constructor({
        contentId,
        repoId,
        branch,
        withDeepSearch,
        timeout,
    }: {
        contentId: string;
        repoId: string;
        branch: RepoBranch;
        withDeepSearch?: boolean;
        timeout?: number;
    }) {
        this.baseContentId = contentId;
        this.repoId = repoId;
        this.branch = branch;
        this.withDeepSearch = withDeepSearch;
        this.timeout = timeout;

        this.logSummary = `base contentId: "${this.baseContentId}" - repoId: ${this.repoId} - branch: ${this.branch}`;

        this.referencesFound = {};
        this.referencesChecked = new Set();

        this.repoConnection = getRepoConnection({
            branch,
            repoId,
            asAdmin: true,
        });
    }

    public run(): Content[] | null {
        this.referencesFound = {};
        this.referencesChecked.clear();
        if (this.timeout) {
            this.deadline = Date.now() + this.timeout;
        }

        const start = Date.now();

        try {
            this.findReferences(this.baseContentId);
        } catch (e) {
            logger.error(`Reference search failed with error: ${e} - [${this.logSummary}]`);
            return null;
        }

        const duration = Date.now() - start;

        logger.info(`Reference search completed in ${duration} ms - [${this.logSummary}]`);

        return Object.values(this.referencesFound);
    }

    private logResult(msg: string, contentId: string) {
        logger.info(`${msg} [contentId: "${contentId}" - ${this.logSummary}]`);
    }

    // Should only return localized content nodes
    private contentNodeQuery = ({
        filters,
        query,
    }: {
        filters?: BooleanFilter;
        query?: string;
    }) => {
        const { total, hits } = this.repoConnection.query({
            start: 0,
            count: QUERY_COUNT,
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
        });

        if (total > QUERY_COUNT) {
            logger.error(
                `References query matched ${total} content nodes, maximum allowed is set to ${QUERY_COUNT} - [${this.logSummary}]`
            );
        }

        return hits;
    };

    private findReferences(contentId: string) {
        if (this.referencesChecked.has(contentId)) {
            return;
        }

        this.referencesChecked.add(contentId);

        this.findAndProcessReferences(() => this.findExplicitRefs(contentId));
        this.findAndProcessReferences(() => this.findTextRefs(contentId));

        const content = this.repoConnection.get<Content>(contentId);
        if (!content) {
            return;
        }

        this.findAndProcessReferences(() => this.findOverviewRefs(content));
        this.findAndProcessReferences(() => this.findFormsOverviewRefs(content));
        this.findAndProcessReferences(() => this.findOfficeBranchRefs(content));
        this.findAndProcessReferences(() => this.findContactInfoRefs(content));
        this.findAndProcessReferences(() => this.findMainArticleChapterRefs(content));
        this.findAndProcessReferences(() => this.findParentRefs(content));
    }

    private findAndProcessReferences(findReferencesCallback: () => QueryResult) {
        if (this.deadline && Date.now() > this.deadline) {
            throw new Error(`Reference search timed out after ${this.timeout} ms`);
        }

        return findReferencesCallback.bind(this)().forEach(this.processReference, this);
    }

    // Get the full content node of the reference, and run a deeper search if applicable
    private processReference(nodeQueryHitId: QueryHit) {
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

    private findExplicitRefs(contentId: string): QueryResult {
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

        this.logResult(`Found ${result.length} contents with explicit references`, contentId);

        return result;
    }

    private findTextRefs(contentId: string): QueryResult {
        const result = this.contentNodeQuery({
            query: `fulltext('_allText', '"${contentId}"')`,
        });

        this.logResult(`Found ${result.length} contents with text references`, contentId);

        return result;
    }

    // Overview pages are generated from meta-data of certain content types
    private findOverviewRefs(content: ContentNode): QueryResult {
        if (!typesWithOverviewPages.has(content.type)) {
            return [];
        }

        const { _id, language, data } = content;

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

        this.logResult(`Found ${result.length} relevant overview pages`, _id);

        return result;
    }

    // Forms overview pages are generated from meta-data of certain content types
    private findFormsOverviewRefs(content: ContentNode): QueryResult {
        if (!typesWithFormsOverviewPages.has(content.type)) {
            return [];
        }

        const { _id, language, data } = content;

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

        this.logResult(`Found ${result.length} relevant forms overview pages`, _id);

        return result;
    }

    // Changes to an office editorial page affects all office-branch pages in the same language
    private findOfficeBranchRefs(content: ContentNode): QueryResult {
        if (content.type !== 'no.nav.navno:office-editorial-page') {
            return [];
        }

        const { _id, language } = content;

        const result = this.contentNodeQuery({
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

        this.logResult(`Found ${result.length} relevant office branch pages`, _id);

        return result;
    }

    // Contact-option parts for chat which does not have a sharedContactInformation field set will have
    // a default option set via graphql schema creation callback.
    private findContactInfoRefs(content: ContentNode): QueryResult {
        const { _id, language, type, data } = content;

        if (type !== 'no.nav.navno:contact-information' || data.contactType._selected !== 'chat') {
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
                                values: [language],
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

        this.logResult(`Found ${result.length} references to chat contact info`, _id);

        return result;
    }

    // Handle content types which generates content from their parent, without explicit references
    private findParentRefs(content: ContentNode): QueryResult {
        const { _path, type } = content;

        const parentNode = this.repoConnection.get<Content>({ key: getParentPath(_path) });
        if (!parentNode) {
            return [];
        }

        const parentIdHit = { id: parentNode._id };

        // Publishing calendars are generated from their entry children
        if (type === 'no.nav.navno:publishing-calendar-entry') {
            return parentNode.type === 'no.nav.navno:publishing-calendar' ? [parentIdHit] : [];
        }

        // Changes to a main-article-chapter also affects its parent main-article, and sibling chapters
        if (type === 'no.nav.navno:main-article-chapter') {
            return parentNode.type === 'no.nav.navno:main-article'
                ? [parentIdHit, ...this.findMainArticleChapterRefs(parentNode)]
                : [];
        }

        return [];
    }

    // Chapters are attached to an article only via the parent/children relation
    private findMainArticleChapterRefs(content: ContentNode): QueryResult {
        const { _id, _path, type } = content;

        if (type !== 'no.nav.navno:main-article') {
            return [];
        }

        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: '_parentPath',
                                values: [_path],
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

        this.logResult(`Found ${result.length} main-article chapters`, _id);

        return result;
    }
}
