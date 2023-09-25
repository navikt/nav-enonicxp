import { Content } from '/lib/xp/content';
import { RepoConnection, NodeQueryHit, RepoNode } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import {
    contentTypesInFormsOverviewPages,
    contentTypesInOverviewPages,
    contentTypesWithDeepReferences,
} from '../contenttype-lists';
import { getRepoConnection } from '../utils/repo-utils';
import { APP_DESCRIPTOR, CONTENT_ROOT_REPO_ID } from '../constants';
import { ContentDescriptor } from '../../types/content-types/content-config';

type ConstructorParams = {
    baseContentId: string;
    branch: RepoBranch;
    withDeepSearch?: boolean;
};

type ContentDescriptorSet = ReadonlySet<ContentDescriptor>;

const typesWithDeepReferences: ContentDescriptorSet = new Set(contentTypesWithDeepReferences);
const typesWithOverviewPages: ContentDescriptorSet = new Set([
    ...contentTypesInOverviewPages,
    `${APP_DESCRIPTOR}:product-details`,
]);
const typesWithFormsOverviewPages: ContentDescriptorSet = new Set([
    ...contentTypesInFormsOverviewPages,
    `${APP_DESCRIPTOR}:form-details`,
]);

export class FindContentReferences {
    private readonly baseContentId: string;
    private readonly branch: RepoBranch;
    private readonly withDeepSearch: boolean;

    private readonly repoConnection: RepoConnection;

    private readonly referencesFound: Record<string, Content>;
    private readonly referencesChecked: Set<string>;

    constructor({ baseContentId, branch, withDeepSearch }: ConstructorParams) {
        this.baseContentId = baseContentId;
        this.branch = branch;
        this.withDeepSearch = !!withDeepSearch;
        this.referencesFound = {};
        this.referencesChecked = new Set();

        this.repoConnection = getRepoConnection({
            branch,
            repoId: CONTENT_ROOT_REPO_ID,
            asAdmin: true,
        });
    }

    public run(): Content[] {
        this.findReferences(this.baseContentId);

        return Object.values(this.referencesFound);
    }

    private findReferences(contentId: string) {
        if (this.referencesChecked.has(contentId)) {
            return;
        }

        this.referencesChecked.add(contentId);

        this.findExplicitReferences(contentId).forEach(this.processReference);
        this.findTextReferences(contentId).forEach(this.processReference);

        const content = this.repoConnection.get<Content>(this.baseContentId);
        if (!content) {
            return;
        }

        this.findOverviewReferences(content).forEach(this.processReference);
    }

    private processReference(nodeQueryHit: NodeQueryHit) {
        const { id } = nodeQueryHit;

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

    private findExplicitReferences(contentId: string) {
        const result = this.repoConnection.query({
            start: 0,
            count: 1000,
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
        }).hits;

        logger.info(`Found ${result.length} contents with explicit references to "${contentId}"`);

        return result;
    }

    private findTextReferences(contentId: string) {
        const result = this.repoConnection.query({
            start: 0,
            count: 1000,
            query: `_path NOT LIKE "/archive/*" AND fulltext('_allText', '"${contentId}"')`,
        }).hits;

        logger.info(`Found ${result.length} contents with text references to "${contentId}"`);

        return result;
    }

    // Overview pages are generated from meta-data of certain content types, and does not generate
    // references to the listed content
    private findOverviewReferences(content: RepoNode<Content<any>>) {
        if (!typesWithOverviewPages.has(content.type)) {
            return [];
        }

        const { language, data } = content;

        const selectedAudience = data?.audience?._selected;
        if (!selectedAudience) {
            return [];
        }

        const result = this.repoConnection.query({
            start: 0,
            count: 1000,
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
        }).hits;

        logger.info(`Found ${result.length} relevant overview pages`);

        return result;
    }

    private findFormsOverviewReferences(content: RepoNode<Content<any>>) {
        if (!typesWithFormsOverviewPages.has(content.type)) {
            return [];
        }

        const { language, data } = content;

        const selectedAudience = data?.audience?._selected;
        if (!selectedAudience) {
            return [];
        }

        const result = this.repoConnection.query({
            start: 0,
            count: 1000,
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
        }).hits;

        logger.info(`Found ${result.length} relevant forms overview pages`);

        return result;
    }
}
