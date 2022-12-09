import nodeLib, { RepoNode, RepoConnection } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { fixDateFormat, forceArray } from '../utils/nav-utils';
import { searchRepo } from '../constants';
import { logger } from '../utils/logging';
import { ContentFacet, SearchNode, SearchNodeCreateParams } from '../../types/search';

export const searchRepoDeletionQueueBaseNode = 'deletionQueue';
export const searchRepoContentBaseNode = 'content';
export const searchRepoUpdateStateNode = 'updateState';

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
    facets1: ContentFacet | ContentFacet[],
    facets2: ContentFacet | ContentFacet[]
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

// TODO: support multiple facets? Just replicating the legacy behaviour for now...
const transformFacetsToLegacyBehaviour = (facets: ContentFacet[]): ContentFacet | null => {
    if (facets.length === 0) {
        return null;
    }

    const facet = facets.slice(-1)[0];
    const { underfacets } = facet;

    if (!underfacets || underfacets.length === 0) {
        return facet;
    }

    return {
        ...facet,
        underfacets: underfacets.slice(-1),
    };
};

// Note: datetimes must be provided as Date-objects with a format accepted by Nashorn
// in order for the datetime to be indexed as the correct type
const searchNodeTransformer = (
    contentNode: RepoNode<Content>,
    facet: ContentFacet
): SearchNodeCreateParams => {
    const { createdTime, modifiedTime, publish, ...rest } = contentNode;

    return {
        ...rest,
        [searchRepoFacetsKey]: facet,
        [searchRepoContentIdKey]: contentNode._id,
        [searchRepoContentPathKey]: contentNode._path,
        _name: contentNode._path.replace(/\//g, '_'),
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
        // Move before deleting, as deletion is not a syncronous operation and we may
        // want the node path freed up immediately
        repo.move({
            source: nodeId,
            target: `/${searchRepoDeletionQueueBaseNode}/${nodeId}`,
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

const searchNodeIsFresh = (searchNode: SearchNode, contentNode: Content, facet: ContentFacet) =>
    searchNode &&
    facetsAreEqual(facet, searchNode.facets) &&
    new Date(fixDateFormat(contentNode.modifiedTime)).getTime() ===
        new Date(fixDateFormat(searchNode.modifiedTime)).getTime();

export const createOrUpdateSearchNode = (
    contentNode: RepoNode<Content>,
    facets: ContentFacet[],
    searchRepoConnection: RepoConnection
) => {
    const facet = transformFacetsToLegacyBehaviour(facets);
    if (!facet) {
        return false;
    }

    const contentId = contentNode._id;
    const contentPath = contentNode._path;

    const existingSearchNodes = searchRepoConnection.query({
        start: 0,
        count: 1000,
        filters: {
            hasValue: {
                field: searchRepoContentIdKey,
                values: [contentId],
            },
        },
    }).hits;

    const searchNodeParams = searchNodeTransformer(contentNode, facet);

    if (existingSearchNodes.length === 1) {
        const searchNodeId = existingSearchNodes[0].id;
        const searchNode = searchRepoConnection.get(searchNodeId);

        if (searchNodeIsFresh(searchNode, contentNode, facet)) {
            return false;
        }

        searchRepoConnection.modify({
            key: searchNodeId,
            editor: () => searchNodeParams,
        });
        return true;
    } else if (existingSearchNodes.length > 1) {
        // If multiple search nodes exists for a content, something has gone wrong at some point
        // in the past. Remove everything and notify the problem has occured.
        logger.critical(`Multiple existing search nodes found for [${contentId}] ${contentPath}`);

        existingSearchNodes.forEach((node) => {
            deleteSearchNode(node.id, searchRepoConnection);
        });
    }

    try {
        const fullPath = `${searchNodeParams._parentPath}/${searchNodeParams._name}`;
        if (searchRepoConnection.exists(fullPath)) {
            deleteSearchNode(fullPath, searchRepoConnection);
        }

        const newSearchNode = searchRepoConnection.create(searchNodeParams);
        if (!newSearchNode) {
            logger.critical(`Failed to create search node for content from ${contentPath}`);
            return false;
        }

        logger.info(`Created search node for ${contentPath} with facets ${JSON.stringify(facet)}`);
        return true;
    } catch (e) {
        logger.critical(`Error while creating search node for content from ${contentPath} - ${e}`);
        return false;
    }
};
