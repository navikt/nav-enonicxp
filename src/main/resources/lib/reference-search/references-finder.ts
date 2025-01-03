import { Content, BooleanFilter } from '/lib/xp/content';
import { RepoConnection, NodeQueryResultHit } from '/lib/xp/node';
import * as contextLib from '/lib/xp/context';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import {
    contentTypesInFormsOverviewPages,
    contentTypesInOverviewPages,
    contentTypesWithDeepReferences,
} from '../contenttype-lists';
import { getRepoConnection } from '../repos/repo-utils';
import { APP_DESCRIPTOR } from '../constants';
import { ContentDescriptor, ContentNode } from '../../types/content-types/content-config';
import { getParentPath } from '../paths/path-utils';
import { NON_LOCALIZED_QUERY_FILTER } from '../localization/layers-repo-utils/localization-state-filters';
import { forceArray } from '../utils/array-utils';
import { isValidBranch } from '../context/branches';
import { Overview } from '@xp-types/site/content-types/overview';

type ContentDescriptorSet = ReadonlySet<ContentDescriptor>;

type OverviewType = Overview['overviewType'];

type QueryHit = Pick<NodeQueryResultHit, 'id'>;
type QueryResult = ReadonlyArray<QueryHit>;

type Logger = typeof logger;

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

const createLogger = (msgSuffix: string, errorsOnly?: boolean): Logger => {
    const noop = () => ({});
    const suffixedMsg = (msg: string) => `${msg}${msgSuffix}`;

    return {
        info: errorsOnly ? noop : (msg) => logger.info(suffixedMsg(msg)),
        warning: errorsOnly ? noop : (msg) => logger.warning(suffixedMsg(msg)),
        error: (msg) => logger.error(suffixedMsg(msg)),
        critical: (msg) => logger.critical(suffixedMsg(msg)),
    };
};

export class ReferencesFinder {
    private readonly baseContentId: string;
    private readonly repoId: string;
    private readonly branch: RepoBranch;
    private readonly withDeepSearch?: boolean;
    private readonly timeout?: number;

    private readonly repoConnection: RepoConnection;
    private readonly logger: Logger;

    private referencesFound: Record<string, Content>;
    private referencesChecked: Set<string>;
    private deadline?: number;

    constructor({
        contentId,
        repoId,
        branch,
        withDeepSearch,
        timeout,
        logErrorsOnly,
    }: {
        contentId: string;
        branch?: RepoBranch;
        repoId?: string;
        withDeepSearch?: boolean;
        timeout?: number;
        logErrorsOnly?: boolean;
    }) {
        const { repository: repoIdFromContext, branch: branchFromContext } = contextLib.get();

        this.baseContentId = contentId;
        this.repoId = repoId || repoIdFromContext;
        this.branch = branch || (isValidBranch(branchFromContext) ? branchFromContext : 'master');
        this.withDeepSearch = withDeepSearch;
        this.timeout = timeout;

        const msgSuffix = ` - [base contentId: "${this.baseContentId}" - repoId: "${this.repoId}" - branch: ${this.branch}]`;

        this.logger = createLogger(msgSuffix, logErrorsOnly);

        this.referencesFound = {};
        this.referencesChecked = new Set();

        this.repoConnection = getRepoConnection({
            branch: this.branch,
            repoId: this.repoId,
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
            this.logger.error(`Reference search failed with error: ${e}`);
            return null;
        }

        const duration = Date.now() - start;

        this.logger.info(`Reference search completed in ${duration} ms`);

        return Object.values(this.referencesFound);
    }

    private logResult(msg: string, contentId: string, result: ReadonlyArray<NodeQueryResultHit>) {
        if (result.length > 0) {
            this.logger.info(`Found ${result.length} refs for ${msg} - contentId: "${contentId}"`);
        }
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
                        ...NON_LOCALIZED_QUERY_FILTER,
                        ...forceArray(filters?.boolean?.mustNot),
                    ],
                    must: [
                        {
                            hasValue: {
                                field: '_nodeType',
                                values: ['content'],
                            },
                        },
                        ...forceArray(filters?.boolean?.must),
                    ],
                },
            },
        });

        if (total > QUERY_COUNT) {
            this.logger.error(
                `References query matched ${total} content nodes, maximum allowed is set to ${QUERY_COUNT}`
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
        this.findAndProcessReferences(() => this.findAlertInContextRefs(content));
        this.findAndProcessReferences(() => this.findOfficeRefs(content));
        this.findAndProcessReferences(() => this.findContactInfoRefs(content));
        this.findAndProcessReferences(() => this.findMainArticleChapterRefs(content));
        this.findAndProcessReferences(() => this.findParentRefs(content));
    }

    private findAndProcessReferences(findReferencesCallback: () => QueryResult) {
        if (this.deadline && Date.now() > this.deadline) {
            throw new Error(`Reference search timed out after ${this.timeout} ms`);
        }

        findReferencesCallback.bind(this)().forEach(this.processReference, this);
    }

    // Get the full content node of the reference, and run a deeper search if applicable
    private processReference(nodeQueryHitId: QueryHit) {
        const { id } = nodeQueryHitId;

        if (this.referencesFound[id] || id === this.baseContentId) {
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

        this.logResult('explicit references', contentId, result);

        return result;
    }

    private findTextRefs(contentId: string): QueryResult {
        const result = this.contentNodeQuery({
            query: `fulltext('_allText', '"${contentId}"')`,
        });

        this.logResult('text references', contentId, result);

        return result;
    }

    private getRelevantOverviewTypes(content: ContentNode<any>): OverviewType[] {
        if (content.type === 'no.nav.navno:product-details') {
            return forceArray(content.data.detailType);
        }

        const overviewTypes: OverviewType[] = [];

        if (content.data.processing_times) {
            overviewTypes.push('processing_times');
        }
        if (content.data.payout_dates) {
            overviewTypes.push('payout_dates');
        }
        if (content.data.rates) {
            overviewTypes.push('rates');
        }

        return overviewTypes;
    }

    // Overview pages are generated from meta-data of certain content types
    private findOverviewRefs(content: ContentNode<any>): QueryResult {
        if (!typesWithOverviewPages.has(content.type)) {
            return [];
        }

        const overviewTypes = this.getRelevantOverviewTypes(content);
        if (overviewTypes.length === 0) {
            return [];
        }

        const mustRules = [
            {
                hasValue: {
                    field: 'type',
                    values: ['no.nav.navno:overview'],
                },
            },
            {
                hasValue: {
                    field: 'language',
                    values: [content.language],
                },
            },
            {
                hasValue: {
                    field: 'data.overviewType',
                    values: overviewTypes,
                },
            },
        ];

        const selectedAudience = content.data.audience?._selected;

        if (selectedAudience) {
            mustRules.push({
                hasValue: {
                    field: 'data.audience',
                    values: [selectedAudience],
                },
            });
            // Product details does not have an audience type. For all other relevant types
            // we require the audience to be set
        } else if (content.type !== 'no.nav.navno:product-details') {
            return [];
        }

        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: mustRules,
                },
            },
        });

        this.logResult('overview pages', content._id, result);

        return result;
    }

    private findAlertInContextRefs = (content: ContentNode): QueryResult => {
        if (content.type !== 'no.nav.navno:alert-in-context') {
            return [];
        }

        const targetContent = content.data.target[content.data.target?._selected]?.targetContent;

        if (!targetContent) {
            return [];
        }

        const targetIds = forceArray(targetContent);

        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'type',
                                values: ['no.nav.navno:form-details'],
                            },
                        },
                        {
                            hasValue: {
                                field: '_id',
                                values: targetIds,
                            },
                        },
                    ],
                },
            },
        });

        this.logResult('alert in context pages', content._id, result);

        return result;
    };

    // Forms overview pages are generated from meta-data of certain content types
    private findFormsOverviewRefs(content: ContentNode<any>): QueryResult {
        if (!typesWithFormsOverviewPages.has(content.type)) {
            return [];
        }

        if (content.type !== 'no.nav.navno:form-details' && !content.data.formDetailsTargets) {
            return [];
        }

        const selectedAudience = forceArray(content.data.audience?._selected);
        if (selectedAudience.length === 0) {
            return [];
        }

        const mustRules = [
            {
                hasValue: {
                    field: 'type',
                    values: ['no.nav.navno:forms-overview'],
                },
            },
            {
                hasValue: {
                    field: 'language',
                    values: [content.language],
                },
            },
        ];

        const shouldRules = selectedAudience.map((audience) => {
            if (audience === 'provider') {
                const selectedProviderAudience = forceArray(
                    content.data.audience.provider?.provider_audience
                );

                return {
                    hasValue: {
                        field: 'data.audience.provider.pageType.overview.provider_audience',
                        values: selectedProviderAudience,
                    },
                };
            }

            return {
                hasValue: {
                    field: 'data.audience._selected',
                    values: [audience],
                },
            };
        });

        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: mustRules,
                    should: shouldRules,
                },
            },
        });

        this.logResult('forms overview pages', content._id, result);

        return result;
    }

    // Changes to an office editorial page affects all office-page in the same language
    private findOfficeRefs(content: ContentNode): QueryResult {
        if (content.type !== 'no.nav.navno:office-editorial-page') {
            return [];
        }

        const result = this.contentNodeQuery({
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'type',
                                values: ['no.nav.navno:office-page'],
                            },
                        },
                        {
                            hasValue: {
                                field: 'language',
                                values: [content.language],
                            },
                        },
                    ],
                },
            },
        });

        this.logResult('office pages', content._id, result);

        return result;
    }

    // Contact-option parts for chat which does not have a sharedContactInformation field set will have
    // a default option set via graphql schema creation callback.
    private findContactInfoRefs(content: ContentNode): QueryResult {
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
                            notExists: {
                                field: 'components.part.config.no-nav-navno.contact-option.contactOptions.chat.sharedContactInformation',
                            },
                        },
                        {
                            hasValue: {
                                field: 'language',
                                values: [content.language],
                            },
                        },
                    ],
                },
            },
        });

        this.logResult('chat contact info', content._id, result);

        return result;
    }

    // Handle content types which generates content from their parent, without explicit references
    private findParentRefs(content: ContentNode): QueryResult {
        const parentNode = this.repoConnection.get<Content>({ key: getParentPath(content._path) });
        if (!parentNode) {
            return [];
        }

        const parentIdHit = { id: parentNode._id };

        // Publishing calendars are generated from their entry children
        if (content.type === 'no.nav.navno:publishing-calendar-entry') {
            return parentNode.type === 'no.nav.navno:publishing-calendar' ? [parentIdHit] : [];
        }

        // Changes to a main-article-chapter also affects its parent main-article, and sibling chapters
        if (content.type === 'no.nav.navno:main-article-chapter') {
            return parentNode.type === 'no.nav.navno:main-article'
                ? [parentIdHit, ...this.findMainArticleChapterRefs(parentNode)]
                : [];
        }

        return [];
    }

    // Chapters are attached to an article only via the parent/children relation
    private findMainArticleChapterRefs(content: ContentNode): QueryResult {
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

        this.logResult('main-article chapters', content._id, result);

        return result;
    }
}
