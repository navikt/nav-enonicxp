import { RepoConnection, RepoNode } from '/lib/xp/node';
import { stripPathPrefix } from '../paths/path-utils';
import { logger } from '../utils/logging';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { NON_LOCALIZED_QUERY_FILTER } from '../localization/layers-repo-utils/localization-state-filters';

type ContentRef = {
    id: string;
    name: string;
    displayName: string;
    ts: string;
};

type ContentTreeNode = {
    path: string;
    name: string;
    displayName: string;
    contents: ContentRef[];
    children: Record<string, ContentTreeNode>;
};

export class ArchiveContentTree {
    private readonly BATCH_COUNT = 100;

    private readonly locale: string;
    private readonly repoConnection: RepoConnection;
    private readonly rootNode: ContentTreeNode;

    constructor(locale: string) {
        this.locale = locale;
        this.repoConnection = getRepoConnection({
            branch: 'draft',
            asAdmin: true,
            repoId: getLayersData().localeToRepoIdMap[locale],
        });
        this.rootNode = {
            path: '/',
            name: `archive-root-node-${locale}`,
            displayName: `Archive root node for ${locale}`,
            contents: [],
            children: {},
        };
    }

    public build() {
        this.processContentBatch(0);
        return this.rootNode;
    }

    private processContentBatch(start: number) {
        const parentContentBatch = this.repoConnection.query({
            start,
            count: this.BATCH_COUNT,
            filters: { boolean: { mustNot: NON_LOCALIZED_QUERY_FILTER } },
            query: {
                boolean: {
                    must: [
                        {
                            like: {
                                field: '_path',
                                value: '/archive/*',
                            },
                        },
                        {
                            exists: {
                                field: 'originalParentPath',
                            },
                        },
                        {
                            exists: {
                                field: 'originalName',
                            },
                        },
                    ],
                },
            },
        });

        parentContentBatch.hits.forEach((hit) => {
            const content = this.repoConnection.get<Content>(hit.id);
            if (!content?.originalParentPath) {
                logger.error(
                    `No valid content found for ${hit.id} [${this.locale}] (found ${content?._id})`
                );
                return;
            }

            const originalPath = `${content.originalParentPath}/${content.originalName}`;
            this.updateContentTreeNode(content, stripPathPrefix(originalPath));
        });

        // const nextStart = start + this.BATCH_COUNT;
        //
        // if (parentContentBatch.total > nextStart) {
        //     this.processContentBatch(nextStart);
        // }
    }

    private updateContentTreeNode(content: RepoNode<Content>, path: string) {
        const pathSegments = path.split('/');
        const treeNode = this.getOrCreateTreeNode(pathSegments, 0);

        treeNode.contents.push({
            id: content._id,
            name: content._name,
            displayName: content.displayName,
            ts: content._ts,
        });

        if (!treeNode.displayName) {
            treeNode.displayName = content.displayName;
        }

        this.processChildren(treeNode, content);
    }

    private processChildren(parentTreeNode: ContentTreeNode, parentContentNode: RepoNode<Content>) {
        const children = this.repoConnection.findChildren({
            parentKey: parentContentNode._id,
            count: 1000,
        });

        children.hits.forEach(({ id }) => {
            const childContent = this.repoConnection.get<Content>(id);
            if (!childContent) {
                logger.error(
                    `No child content found for ${id} [${this.locale}] (parent: ${parentContentNode._id})`
                );
                return;
            }

            const path = `${parentTreeNode.path}/${childContent._name}`;

            this.updateContentTreeNode(childContent, path);
        });
    }

    // Traverses the tree until it hits the target path, and returns the node for that path
    // Creates any missing nodes along the way.
    private getOrCreateTreeNode(
        pathSegments: string[],
        currentSegmentIndex: number,
        parentNode = this.rootNode
    ): ContentTreeNode {
        const currentSegment = pathSegments[currentSegmentIndex];

        if (!parentNode.children[currentSegment]) {
            const currentPath = `/${pathSegments.slice(0, currentSegmentIndex).join('/')}`;
            parentNode.children[currentSegment] = {
                path: currentPath,
                name: currentSegment,
                displayName: '',
                children: {},
                contents: [],
            };
        }

        const currentNode = parentNode.children[currentSegment];
        const nextSegmentIndex = currentSegmentIndex + 1;

        return nextSegmentIndex === pathSegments.length
            ? currentNode
            : this.getOrCreateTreeNode(pathSegments, nextSegmentIndex, currentNode);
    }
}
