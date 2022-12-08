import nodeLib, { RepoConnection } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { getSearchConfig } from './config';
import { contentRepo } from '../constants';
import { forceArray, removeDuplicates } from '../utils/nav-utils';
import { batchedNodeQuery } from '../utils/batched-query';
import {
    createSearchNodeIfFacetsMatched,
    getSearchRepoConnection,
    searchRepoContentBaseNode,
    searchRepoContentIdKey,
} from './utils';
import { ContentFacet, SearchNode } from '../../types/search';
import { SearchConfigDescriptor } from '../../types/content-types/content-config';

const contentBasePath = `/${searchRepoContentBaseNode}`;

// Remove any existing search nodes which no longer points to content
// that should be indexed by the search
const deleteInvalidNodes = (searchableContentIds: string[], repo: RepoConnection) => {
    const invalidSearchNodes = batchedNodeQuery({
        queryParams: {
            start: 0,
            count: 50000,
            query: `_parentPath LIKE "${contentBasePath}*"`,
            filters: {
                boolean: {
                    mustNot: {
                        hasValue: {
                            field: 'contentId',
                            values: searchableContentIds,
                        },
                    },
                },
            },
        },
        repo,
    }).hits;

    if (invalidSearchNodes.length > 0) {
        logger.info(`Found ${invalidSearchNodes.length} invalid search nodes - deleting`);

        invalidSearchNodes.forEach((hit) => {
            repo.delete(hit.id);
        });
    }
};

const splitMatchedContentIdsBySearchNodeFreshness = ({
    facet,
    underfacet,
    matchedContentIds,
    searchRepoConnection,
}: {
    facet: string;
    underfacet?: string;
    matchedContentIds: string[];
    searchRepoConnection: RepoConnection;
}): {
    withFreshSearchNodes: string[];
    withStaleOrMissingSearchNodes: string[];
} => {
    const existingSearchNodeIds = batchedNodeQuery({
        queryParams: {
            start: 0,
            count: 50000,
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: searchRepoContentIdKey,
                                values: matchedContentIds,
                            },
                        },
                    ],
                },
            },
        },
        repo: searchRepoConnection,
    }).hits.map((hit) => hit.id);

    if (existingSearchNodeIds.length === 0) {
        return {
            withFreshSearchNodes: [],
            withStaleOrMissingSearchNodes: matchedContentIds,
        };
    }

    const existingSearchNodes = forceArray(
        searchRepoConnection.get<SearchNode>(existingSearchNodeIds) || []
    );

    const withFreshSearchNodes: string[] = [];
    const withStaleSearchNodes: string[] = [];

    existingSearchNodes.forEach((node) => {
        const searchNodeIsFresh = forceArray(node.facets).some((nodeFacet) => {
            const ufArray = forceArray(nodeFacet.underfacets);
            return (
                nodeFacet.facet === facet &&
                ((!underfacet && ufArray.length === 0) ||
                    (underfacet && ufArray.includes(underfacet)))
            );
        });

        if (searchNodeIsFresh) {
            withFreshSearchNodes.push(node.contentId);
        } else {
            withStaleSearchNodes.push(node.contentId);
        }
    });

    const withMissingSearchNodes = matchedContentIds.filter(
        (contentId) => !existingSearchNodes.some((node) => node.contentId === contentId)
    );

    return {
        withFreshSearchNodes,
        withStaleOrMissingSearchNodes: [...withStaleSearchNodes, ...withMissingSearchNodes],
    };
};

const findNodesToUpdateAndKeep = ({
    searchConfig,
    contentRepoConnection,
    searchRepoConnection,
}: {
    searchConfig: Content<SearchConfigDescriptor>;
    contentRepoConnection: RepoConnection;
    searchRepoConnection: RepoConnection;
}) => {
    const contentIdsWithFacetsToUpdate: Record<string, ContentFacet[]> = {};
    const contentIdsWithFreshSearchNodes: string[] = [];

    const { fasetter, contentTypes } = searchConfig.data;

    forceArray(fasetter).forEach((facet) => {
        const { facetKey, name, ruleQuery, underfasetter } = facet;

        const matchedContentIds = batchedNodeQuery({
            queryParams: {
                start: 0,
                count: 50000,
                query: ruleQuery,
                filters: {
                    hasValue: {
                        field: 'type',
                        values: forceArray(contentTypes),
                    },
                },
            },
            repo: contentRepoConnection,
        }).hits.map((content) => content.id);

        if (matchedContentIds.length === 0) {
            logger.info(`Facet [${facetKey}] ${name} has no matching content`);
            return;
        }

        const ufArray = forceArray(underfasetter);

        if (ufArray.length === 0) {
            const { withFreshSearchNodes, withStaleOrMissingSearchNodes } =
                splitMatchedContentIdsBySearchNodeFreshness({
                    facet: facetKey,
                    matchedContentIds: matchedContentIds,
                    searchRepoConnection,
                });

            contentIdsWithFreshSearchNodes.push(...withFreshSearchNodes);

            withStaleOrMissingSearchNodes.forEach((id) => {
                if (!contentIdsWithFacetsToUpdate[id]) {
                    contentIdsWithFacetsToUpdate[id] = [];
                }
                contentIdsWithFacetsToUpdate[id].push({ facet: facetKey });
            });

            logger.info(
                `Facet [${facetKey}] ${name} triggered updates for ${withStaleOrMissingSearchNodes.length} search nodes - Also found ${withFreshSearchNodes.length} still valid nodes`
            );

            return;
        }

        const contentIdsWithUfs = ufArray.reduce((ufAcc, uf) => {
            const matchedContentIdsForUf = batchedNodeQuery({
                queryParams: {
                    start: 0,
                    count: 50000,
                    query: uf.ruleQuery,
                    filters: {
                        ids: {
                            values: matchedContentIds,
                        },
                    },
                },
                repo: contentRepoConnection,
            }).hits.map((node) => node.id);

            if (matchedContentIdsForUf.length === 0) {
                logger.info(
                    `Underfacet [${facetKey}/${uf.facetKey}] ${name}/${uf.name} has no matching content`
                );
                return ufAcc;
            }

            const { withFreshSearchNodes, withStaleOrMissingSearchNodes } =
                splitMatchedContentIdsBySearchNodeFreshness({
                    facet: facetKey,
                    underfacet: uf.facetKey,
                    matchedContentIds: matchedContentIdsForUf,
                    searchRepoConnection,
                });

            contentIdsWithFreshSearchNodes.push(...withFreshSearchNodes);

            withStaleOrMissingSearchNodes.forEach((contentId) => {
                if (!ufAcc[contentId]) {
                    ufAcc[contentId] = [];
                }
                ufAcc[contentId].push(uf.facetKey);
            });

            logger.info(
                `Underfacet [${facetKey}/${uf.facetKey}] ${name}/${uf.name} triggered updates for ${withStaleOrMissingSearchNodes.length} items - Also found ${withFreshSearchNodes.length} still valid items`
            );

            return ufAcc;
        }, {} as Record<string, string[]>);

        Object.keys(contentIdsWithUfs).forEach((contentId) => {
            if (!contentIdsWithFacetsToUpdate[contentId]) {
                contentIdsWithFacetsToUpdate[contentId] = [];
            }
            contentIdsWithFacetsToUpdate[contentId].push({
                facet: facetKey,
                underfacets: contentIdsWithUfs[contentId],
            });
        });
    });

    return {
        contentIdsWithFacetsToUpdate,
        contentIdsWithFreshSearchNodes: removeDuplicates(contentIdsWithFreshSearchNodes),
    };
};

export const revalidateAllSearchNodes = () => {
    logger.info(`Updating all search nodes!`);

    const config = getSearchConfig();
    if (!config) {
        logger.critical(`No search config found, could not update search nodes!`);
        return;
    }

    const contentRepoConnection = nodeLib.connect({
        repoId: contentRepo,
        branch: 'master',
        user: {
            login: 'su',
        },
        principals: ['role:system.admin'],
    });

    const searchRepoConnection = getSearchRepoConnection();

    const { contentIdsWithFacetsToUpdate, contentIdsWithFreshSearchNodes } =
        findNodesToUpdateAndKeep({
            searchConfig: config,
            contentRepoConnection,
            searchRepoConnection,
        });

    const idsToUpdate = Object.keys(contentIdsWithFacetsToUpdate);

    const startTime = Date.now();
    logger.info(
        `Updating ${idsToUpdate.length} search nodes for new config - ${contentIdsWithFreshSearchNodes.length} existing nodes are still valid`
    );

    idsToUpdate.forEach((contentId) => {
        const contentNode = contentRepoConnection.get<Content>(contentId);
        if (!contentNode) {
            logger.error(`Content not found for id ${contentId}!`);
            return;
        }

        const facets = contentIdsWithFacetsToUpdate[contentId];

        createSearchNodeIfFacetsMatched(contentNode, facets);
    });

    deleteInvalidNodes([...idsToUpdate, ...contentIdsWithFreshSearchNodes], searchRepoConnection);

    logger.info(
        `Updated ${Object.keys(contentIdsWithFacetsToUpdate).length} search nodes - time spent: ${
            Date.now() - startTime
        }ms`
    );
};
