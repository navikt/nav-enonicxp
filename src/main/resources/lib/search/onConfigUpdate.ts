import nodeLib, { RepoConnection } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { getSearchConfig } from './config';
import { contentRepo } from '../constants';
import { forceArray } from '../utils/nav-utils';
import { batchedNodeQuery } from '../utils/batched-query';
import {
    createOrUpdateSearchNode,
    getSearchRepoConnection,
    searchRepoContentBaseNode,
    searchRepoContentIdKey,
} from './utils';
import { ContentFacet, SearchNode } from '../../types/search';
import { SearchConfigDescriptor } from '../../types/content-types/content-config';

const contentBasePath = `/${searchRepoContentBaseNode}`;

// Remove any existing search nodes which no longer points to content
// that should be indexed by the search
const deleteInvalidNodes = (searchableContentIds: string[]) => {
    const searchRepoConnection = getSearchRepoConnection();

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
        repo: searchRepoConnection,
    }).hits;

    if (invalidSearchNodes.length > 0) {
        logger.info(`Found ${invalidSearchNodes.length} invalid search nodes - deleting`);

        invalidSearchNodes.forEach((hit) => {
            searchRepoConnection.delete(hit.id);
        });
    }
};

const findContentWithMatchingFacets = ({
    searchConfig,
    contentRepoConnection,
}: {
    searchConfig: Content<SearchConfigDescriptor>;
    contentRepoConnection: RepoConnection;
}) => {
    const contentIdsWithFacetsToUpdate: Record<string, ContentFacet[]> = {};

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
        }).hits.map((node) => node.id);

        if (matchedContentIds.length === 0) {
            logger.info(`Facet [${facetKey}] ${name} has no matching content`);
            return;
        }

        const ufArray = forceArray(underfasetter);

        if (ufArray.length === 0) {
            matchedContentIds.forEach((id) => {
                if (!contentIdsWithFacetsToUpdate[id]) {
                    contentIdsWithFacetsToUpdate[id] = [];
                }
                contentIdsWithFacetsToUpdate[id].push({ facet: facetKey });
            });

            logger.info(
                `Facet [${facetKey}] ${name} matched ${matchedContentIds.length} content nodes`
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

            matchedContentIdsForUf.forEach((contentId) => {
                if (!ufAcc[contentId]) {
                    ufAcc[contentId] = [];
                }
                ufAcc[contentId].push(uf.facetKey);
            });

            logger.info(
                `Underfacet [${facetKey}/${uf.facetKey}] ${name}/${uf.name} matched ${matchedContentIdsForUf.length} content nodes`
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

    return contentIdsWithFacetsToUpdate;
};

let abortFlag = false;

export const revalidateAllSearchNodesAbort = () => {
    abortFlag = true;
};

export const revalidateAllSearchNodes = () => {
    abortFlag = false;
    const startTime = Date.now();
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

    const contentIdToFacetsMap = findContentWithMatchingFacets({
        searchConfig: config,
        contentRepoConnection,
    });

    const matchedContentIds = Object.keys(contentIdToFacetsMap);
    const numMatchesFound = matchedContentIds.length;

    const searchRepoConnection = getSearchRepoConnection();

    logger.info(`Found ${numMatchesFound} matching contents for facets, running updates`);

    const existingSearchNodeIds = searchRepoConnection
        .query({
            start: 0,
            count: 100000,
            filters: {
                hasValue: {
                    field: searchRepoContentIdKey,
                    values: matchedContentIds,
                },
            },
        })
        .hits.map((node) => node.id);

    logger.info(`Found ${existingSearchNodeIds.length} existing search nodes`);

    const contentIdToSearchNodesMap = forceArray(
        searchRepoConnection.get<SearchNode>(existingSearchNodeIds) || []
    ).reduce((acc, node) => {
        const { contentId } = node;
        if (!acc[contentId]) {
            acc[contentId] = [];
        }
        acc[contentId].push(node);
        return acc;
    }, {} as Record<string, SearchNode[]>);

    let counter = 0;

    const success = matchedContentIds.every((contentId, index) => {
        if (index && index % 1000 === 0) {
            logger.info(
                `Processed search nodes for ${index}/${numMatchesFound} contents (${counter} search nodes updated so far)`
            );
        }

        if (abortFlag) {
            logger.warning(`Abort flag was set, aborting search nodes update!`);
            abortFlag = false;
            return false;
        }

        const contentNode = contentRepoConnection.get<Content>(contentId);
        if (!contentNode) {
            logger.error(`Content not found for id ${contentId}!`);
            return true;
        }

        const searchNodes = contentIdToSearchNodesMap[contentId];
        if (searchNodes && searchNodes.length > 1) {
            logger.warning(
                `Content ${contentId} has multiple search nodes: ${searchNodes
                    .map((node) => node._id)
                    .join(', ')}`
            );
        }

        const facets = contentIdToFacetsMap[contentId];
        if (!facets || facets.length === 0) {
            logger.warning(`Content ${contentId} has no facets!`);
        }

        const didUpdate = createOrUpdateSearchNode(
            contentNode,
            facets,
            getSearchRepoConnection(),
            contentIdToSearchNodesMap[contentId]
        );

        if (didUpdate) {
            counter++;
        }

        return true;
    });

    if (!success) {
        logger.warning(
            `Search nodes update was aborted after ${
                Date.now() - startTime
            }ms - ${counter} nodes were updated`
        );
        return;
    }

    deleteInvalidNodes(matchedContentIds);

    logger.info(
        `Updated ${counter} search nodes from ${
            matchedContentIds.length
        } matched contents - time spent: ${Date.now() - startTime}ms`
    );
};
