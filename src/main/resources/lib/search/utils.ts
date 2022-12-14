import nodeLib, { RepoNode, RepoConnection } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { dateTimesAreEqual, fixDateFormat, forceArray } from '../utils/nav-utils';
import { searchRepo } from '../constants';
import { logger } from '../utils/logging';
import { ContentFacet, SearchNode, SearchNodeCreateParams } from '../../types/search';
import { ArrayOrSingle } from '../../types/util-types';
import { generateUUID } from '../utils/uuid';

export const searchRepoDeletionQueueBaseNode = 'deletionQueue';
export const searchRepoContentBaseNode = 'content';
export const searchRepoUpdateStateNode = 'updateState';
export const searchRepoConfigNode = 'config';

export const searchRepoContentIdKey = 'contentId';
export const searchRepoContentPathKey = 'contentPath';
export const searchRepoFacetsKey = 'facets';

export const getSearchRepoConnection = () =>
    nodeLib.connect({
        repoId: searchRepo,
        branch: 'master',
        user: {
            login: 'su',
        },
        principals: ['role:system.admin'],
    });

export const facetsAreEqual = (
    facets1: ArrayOrSingle<ContentFacet>,
    facets2: ArrayOrSingle<ContentFacet>
) => {
    const facetsArray1 = forceArray(facets1);
    const facetsArray2 = forceArray(facets2);

    return (
        facetsArray1.length === facetsArray2.length &&
        facetsArray1.every((f1) => {
            const ufArray1 = forceArray(f1.underfacets);
            return facetsArray2.some((f2) => {
                const ufArray2 = forceArray(f2.underfacets);
                return (
                    f1.facet === f2.facet &&
                    ufArray1.length === ufArray2.length &&
                    ufArray1.every((uf1) => ufArray2.some((uf2) => uf1 === uf2))
                );
            });
        })
    );
};

// Note: datetimes must be provided as Date-objects with a format accepted by Nashorn
// in order for the datetime to be indexed as the correct type
const searchNodeTransformer = (
    contentNode: RepoNode<Content>,
    facets: ContentFacet[]
): SearchNodeCreateParams => {
    const { createdTime, modifiedTime, publish, ...rest } = contentNode;

    // Add a uuid to prevent name collisions
    const name = `${contentNode._path.replace(/\//g, '_')}-${generateUUID()}`;

    return {
        ...rest,
        [searchRepoFacetsKey]: facets,
        [searchRepoContentIdKey]: contentNode._id,
        [searchRepoContentPathKey]: contentNode._path,
        _name: name,
        _parentPath: `/${searchRepoContentBaseNode}`,
        ...(createdTime && {
            createdTime: new Date(fixDateFormat(contentNode.createdTime)),
        }),
        ...(modifiedTime && {
            modifiedTime: new Date(fixDateFormat(contentNode.modifiedTime)),
        }),
        publish: {
            ...(publish?.first && {
                first: new Date(fixDateFormat(publish.first)),
            }),
            ...(publish?.from && {
                from: new Date(fixDateFormat(publish.from)),
            }),
            ...(publish?.to && {
                to: new Date(fixDateFormat(publish.to)),
            }),
        },
    };
};

const deleteSearchNode = (nodeId: string, repo: RepoConnection) => {
    try {
        // Move before deleting, as deletion is not a synchronous operation and we may
        // want the node path freed up immediately
        repo.move({
            source: nodeId,
            target: `/${searchRepoDeletionQueueBaseNode}/${nodeId}-${generateUUID()}`,
        });

        repo.delete(nodeId);
    } catch (e) {
        logger.critical(`Failed to delete search node ${nodeId} - ${e}`);
    }
};

export const deleteSearchNodesForContent = (contentId: string) => {
    const searchRepoConnection = getSearchRepoConnection();

    searchRepoConnection
        .query({
            start: 0,
            count: 1000,
            filters: {
                hasValue: {
                    field: searchRepoContentIdKey,
                    values: [contentId],
                },
            },
        })
        .hits.forEach((node) => {
            deleteSearchNode(node.id, searchRepoConnection);
        });
};

const searchNodeIsFresh = (searchNode: SearchNode, contentNode: Content, facets: ContentFacet[]) =>
    facetsAreEqual(facets, searchNode.facets) &&
    dateTimesAreEqual(contentNode.modifiedTime, searchNode.modifiedTime);

export const createOrUpdateSearchNode = (
    contentNode: RepoNode<Content>,
    facets: ContentFacet[],
    searchRepoConnection: RepoConnection,
    existingSearchNodes: SearchNode[] = []
) => {
    const contentId = contentNode._id;
    const contentPath = contentNode._path;

    if (facets.length === 0) {
        existingSearchNodes.forEach((node) => {
            deleteSearchNode(node._id, searchRepoConnection);
        });
        return false;
    }

    const searchNodeParams = searchNodeTransformer(contentNode, facets);

    if (existingSearchNodes.length === 1) {
        const searchNode = existingSearchNodes[0];

        if (searchNodeIsFresh(searchNode, contentNode, facets)) {
            return false;
        }

        searchRepoConnection.modify({
            key: searchNode._id,
            editor: () => searchNodeParams,
        });
        return true;
    } else if (existingSearchNodes.length > 1) {
        // If multiple search nodes exists for a content, something has gone wrong at some point
        // in the past. Remove everything and notify the problem has occured.
        logger.critical(
            `Multiple existing search nodes found for [${contentId}] ${contentPath} - ${existingSearchNodes
                .map((node) => node._id)
                .join(', ')}`
        );

        existingSearchNodes.forEach((node) => {
            deleteSearchNode(node._id, searchRepoConnection);
        });
    }

    try {
        const newSearchNode = searchRepoConnection.create(searchNodeParams);
        if (!newSearchNode) {
            logger.critical(`Failed to create search node for content from ${contentPath}`);
            return false;
        }

        logger.info(`Created search node for ${contentPath} with facets ${JSON.stringify(facets)}`);
        return true;
    } catch (e) {
        logger.critical(`Error while creating search node for content from ${contentPath} - ${e}`);
        return false;
    }
};
