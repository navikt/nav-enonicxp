import { RepoConnection, RepoNode } from '/lib/xp/node';
import { stripLeadingAndTrailingSlash, stripPathPrefix } from '../paths/path-utils';
import { logger } from '../utils/logging';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { NON_LOCALIZED_QUERY_FILTER } from '../localization/layers-repo-utils/localization-state-filters';
import { ContentTreeEntry, transformToContentTreeEntry } from './content-tree-entry';

type ArchiveTreeNode = {
    path: string;
    name: string;
    content: ContentTreeEntry;
    children: Record<string, ArchiveTreeNode>;
};

export class ArchiveContentTree {
    private readonly BATCH_COUNT = 1000;

    private readonly locale: string;
    private readonly repoConnection: RepoConnection;
    private readonly rootNode: ArchiveTreeNode;

    constructor(locale: string) {
        this.locale = locale;
        this.repoConnection = getRepoConnection({
            branch: 'draft',
            asAdmin: true,
            repoId: getLayersData().localeToRepoIdMap[locale],
        });

        const rootNodeName = `archive-root-node-${locale}`;
        this.rootNode = {
            path: '/',
            name: rootNodeName,
            content: this.createEmptyContentTreeEntry('/', rootNodeName),
            children: {},
        };
    }

    public build() {
        const start = Date.now();
        this.processContentBatch(0);
        const durationSec = (Date.now() - start) / 1000;
        logger.info(
            `Finished building archive content tree for "${this.locale}" in ${durationSec} seconds`
        );
        return this.rootNode;
    }

    private processContentBatch(start: number) {
        const parentContentBatch = this.repoConnection.query({
            start,
            count: this.BATCH_COUNT,
            filters: {
                boolean: {
                    mustNot: NON_LOCALIZED_QUERY_FILTER,
                    must: [
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
            query: {
                boolean: {
                    must: [
                        {
                            like: {
                                field: '_path',
                                value: '/archive/*',
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
            this.addToContentTree(content, stripPathPrefix(originalPath));
        });

        const nextStart = start + this.BATCH_COUNT;

        if (parentContentBatch.total > nextStart) {
            this.processContentBatch(nextStart);
        }
    }

    private addToContentTree(content: RepoNode<Content>, path: string) {
        const pathSegments = stripLeadingAndTrailingSlash(path).split('/');
        const treeNode = this.getOrCreateTreeNode(pathSegments, 0);

        if (treeNode.content) {
            const newPath = `${path}/${content._id}`;
            logger.info(
                `Content with path ${path} already exists. Retrying with new path ${newPath} for ${content._id} [${this.locale}].`
            );
            this.addToContentTree(content, newPath);
            return;
        }

        treeNode.content = transformToContentTreeEntry(content, this.repoConnection, this.locale);

        this.processChildren(treeNode, content);
    }

    // Traverses the tree until it hits the target path, and returns the node for that path
    // Creates any missing nodes along the way.
    private getOrCreateTreeNode(
        pathSegments: string[],
        currentSegmentIndex: number,
        parentNode = this.rootNode
    ): ArchiveTreeNode {
        const currentSegment = pathSegments[currentSegmentIndex];

        if (!parentNode.children[currentSegment]) {
            const currentPath = `/${pathSegments.slice(0, currentSegmentIndex + 1).join('/')}`;
            parentNode.children[currentSegment] = {
                path: currentPath,
                name: currentSegment,
                children: {},
                content: this.createEmptyContentTreeEntry(currentPath, currentSegment),
            };
        }

        const currentNode = parentNode.children[currentSegment];
        const nextSegmentIndex = currentSegmentIndex + 1;

        return nextSegmentIndex === pathSegments.length
            ? currentNode
            : this.getOrCreateTreeNode(pathSegments, nextSegmentIndex, currentNode);
    }

    private createEmptyContentTreeEntry(path: string, name: string): ContentTreeEntry {
        return {
            id: 'empty-node',
            path,
            name,
            displayName: name,
            type: 'base:folder',
            locale: this.locale,
            numChildren: 1,
            isLocalized: true,
            hasLocalizedDescendants: true,
            isEmpty: true,
        };
    }

    private processChildren(
        parentTreeNode: ArchiveTreeNode,
        parentContentNode: RepoNode<Content>,
        start = 0
    ) {
        const children = this.repoConnection.findChildren({
            parentKey: parentContentNode._id,
            start,
            count: this.BATCH_COUNT,
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

            this.addToContentTree(childContent, path);
        });

        const nextStart = start + this.BATCH_COUNT;

        if (children.total > nextStart) {
            this.processChildren(parentTreeNode, parentContentNode, nextStart);
        }
    }
}
