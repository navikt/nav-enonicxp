import { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { NodeQueryHit } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import { typesWithDeepReferences as _typesWithDeepReferences } from '../contenttype-lists';
import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';

type ConstructorParams = {
    baseContentId: string;
    branch: RepoBranch;
    withDeepSearch?: boolean;
};

const typesWithDeepReferences: ReadonlySet<string> = new Set(_typesWithDeepReferences);

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

        this.findTrueReferences(contentId).forEach((content) => this.processReference(content));
        this.findStringReferences(contentId).forEach((content) => this.processReference(content));
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

        const { _id, type } = content;

        this.referencesFound[_id] = content;

        if (this.withDeepSearch && typesWithDeepReferences.has(type)) {
            this.findReferences(_id);
        }
    }

    private findTrueReferences(contentId: string) {
        const references = this.repoConnection.query({
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

        logger.info(
            `Found ${references.length} contents with explicit references to "${contentId}"`
        );

        return references;
    }

    private findStringReferences(contentId: string) {
        const references = this.repoConnection.query({
            start: 0,
            count: 1000,
            query: `fulltext('components.part.config.*,components.layout.config.*,data.*', '"${contentId}"')`,
        }).hits;

        logger.info(`Found ${references.length} contents with string references to "${contentId}"`);

        return references;
    }
}
