import { getRepoConnection } from '../../utils/repo-utils';
import { RepoConnection } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { getSearchConfig } from './config';
import { batchedMultiRepoNodeQuery, batchedNodeQuery } from '../../utils/batched-query';
import { SEARCH_REPO_CONTENT_BASE_NODE } from './search-utils';
import { ContentFacet } from '../../../types/search';
import { ConfigFacet, SearchConfigDescriptor } from '../../../types/content-types/search-config';
import { createOrUpdateSearchNode } from './create-or-update-search-node';
import { forceArray } from '../../utils/array-utils';
import { NON_LOCALIZED_QUERY_FILTER } from '../../localization/layers-repo-utils/localization-state-filters';
import { sortMultiRepoNodeHitsToBuckets } from '../../localization/layers-repo-utils/sort-and-resolve-hits';
import { getLayersData } from '../../localization/layers-data';
import { getLayersMultiConnection } from '../../localization/layers-repo-utils/layers-repo-connection';
import { getSearchRepoConnection } from '../utils';

type ContentIdsToFacetsMap = Record<string, ContentFacet[]>;
type RepoIdsToContentMap = Record<string, ContentIdsToFacetsMap>;
type ContentIdWithMatchedFacets = { contentId: string; locale: string; facets: ContentFacet[] };

const MAX_NODES_PER_FACET_COUNT = 50000;

const MAX_DELETE_COUNT = 100000;
const DELETION_BATCH_SIZE = 1000;

// Remove any existing search nodes which no longer points to content
// that should be indexed by the search
const deleteInvalidNodes = (validSearchNodeIds: string[], searchRepoConnection: RepoConnection) => {
    const invalidSearchNodes = batchedNodeQuery({
        queryParams: {
            start: 0,
            count: MAX_DELETE_COUNT,
            query: `_parentPath LIKE "/${SEARCH_REPO_CONTENT_BASE_NODE}*"`,
            filters: {
                boolean: {
                    mustNot: {
                        hasValue: {
                            field: '_id',
                            values: validSearchNodeIds,
                        },
                    },
                },
            },
        },
        repo: searchRepoConnection,
    });

    if (invalidSearchNodes.total === 0) {
        logger.info('No invalid search nodes found, nothing to delete!');
        return;
    }

    logger.info(`Found ${invalidSearchNodes.total} invalid search nodes - deleting`);

    if (invalidSearchNodes.total > MAX_DELETE_COUNT) {
        logger.critical(
            `Invalid search nodes count exceeds maximum - Some invalid nodes will be remaining!`
        );
    }

    const nodeIdsToDelete = invalidSearchNodes.hits.map((hit) => hit.id);
    const nodeIdsDeleted: string[] = [];

    for (let i = 0; i < nodeIdsToDelete.length; i += DELETION_BATCH_SIZE) {
        const nodeIdsDeletedBatch = searchRepoConnection.delete(
            nodeIdsToDelete.slice(i, i + DELETION_BATCH_SIZE)
        );
        nodeIdsDeleted.push(...nodeIdsDeletedBatch);
        logger.info(
            `Deleted ${nodeIdsDeleted.length}/${nodeIdsToDelete.length} invalid search nodes`
        );
    }

    if (nodeIdsToDelete.length !== nodeIdsDeleted.length) {
        const nodeIdsDeletedSet = new Set(nodeIdsDeleted);
        const diff = nodeIdsToDelete.filter((id) => !nodeIdsDeletedSet.has(id));

        logger.critical(
            `Failed to delete ${diff.length} invalid search nodes: ${diff.slice(0, 50).join(', ')}${
                diff.length > 50 ? ` (and ${diff.length - 50} more)` : ''
            }`
        );
    } else {
        logger.info(`Successfully deleted ${nodeIdsDeleted.length} invalid search nodes`);
    }
};

const transformToArray = (repoIdsToContent: RepoIdsToContentMap) => {
    const { repoIdToLocaleMap } = getLayersData();

    return Object.entries(repoIdsToContent).reduce<ContentIdWithMatchedFacets[]>(
        (acc, [repoId, contentIdsToFacets]) => {
            const locale = repoIdToLocaleMap[repoId];

            let counter = 0;

            Object.entries(contentIdsToFacets).forEach(([contentId, facets]) => {
                counter++;
                acc.push({ contentId, locale, facets });
            });

            logger.info(`Found ${counter} search entries in layer for locale ${locale}`);

            return acc;
        },
        []
    );
};

const populateContentIdsToFacetsMap = ({
    facet,
    repoId,
    matchedContentIdsForFacet,
    contentIdsToFacetsMap,
}: {
    facet: ConfigFacet;
    repoId: string;
    matchedContentIdsForFacet: string[];
    contentIdsToFacetsMap: ContentIdsToFacetsMap;
}) => {
    const { facetKey, name } = facet;

    const underfacets = forceArray(facet.underfasetter);

    if (underfacets.length === 0) {
        matchedContentIdsForFacet.forEach((id) => {
            if (!contentIdsToFacetsMap[id]) {
                contentIdsToFacetsMap[id] = [];
            }
            contentIdsToFacetsMap[id].push({ facet: facetKey });
        });
        logger.info(
            `Facet [${facetKey}] ${name} matched ${matchedContentIdsForFacet.length} content nodes in ${repoId}`
        );
        return;
    }

    const repoConnection = getRepoConnection({ branch: 'master', repoId });

    const contentIdsToUnderfacets = underfacets.reduce<Record<string, string[]>>((acc, uf) => {
        const ufMatches = batchedNodeQuery({
            queryParams: {
                start: 0,
                count: MAX_NODES_PER_FACET_COUNT,
                query: uf.ruleQuery,
                filters: {
                    ids: {
                        values: matchedContentIdsForFacet,
                    },
                },
            },
            repo: repoConnection,
        }).hits;

        const ufLogString = `[${facetKey}/${uf.facetKey}] ${name}/${uf.name}`;

        if (ufMatches.length === 0) {
            logger.info(`Underfacet ${ufLogString} has no matching content in ${repoId}`);
            return acc;
        }

        logger.info(
            `Underfacet ${ufLogString} matched ${ufMatches.length} content nodes in ${repoId}`
        );

        ufMatches.forEach(({ id }) => {
            if (!acc[id]) {
                acc[id] = [];
            }
            acc[id].push(uf.facetKey);
        });

        return acc;
    }, {});

    Object.entries(contentIdsToUnderfacets).forEach(([contentId, underfacets]) => {
        if (!contentIdsToFacetsMap[contentId]) {
            contentIdsToFacetsMap[contentId] = [];
        }

        contentIdsToFacetsMap[contentId].push({
            facet: facetKey,
            underfacets,
        });
    });
};

const getContentWithMatchingFacets = (
    searchConfig: Content<SearchConfigDescriptor>
): ContentIdWithMatchedFacets[] => {
    const layersMultiRepoConnection = getLayersMultiConnection('master');
    const repoIdsToContentMaps: RepoIdsToContentMap = {};

    const facets = forceArray(searchConfig.data.fasetter);
    const contentTypes = forceArray(searchConfig.data.contentTypes);

    facets.forEach((facet) => {
        const { facetKey, name, ruleQuery } = facet;

        const { hits: matchesFromAllLayers, total: matchesTotal } = batchedMultiRepoNodeQuery({
            queryParams: {
                start: 0,
                count: MAX_NODES_PER_FACET_COUNT,
                query: `(${ruleQuery}) AND _path LIKE "/content/*"`,
                filters: {
                    boolean: {
                        must: {
                            hasValue: {
                                field: 'type',
                                values: contentTypes,
                            },
                        },
                        mustNot: NON_LOCALIZED_QUERY_FILTER,
                    },
                },
            },
            repo: layersMultiRepoConnection,
        });

        if (matchesTotal === 0) {
            logger.info(`Facet [${facetKey}] ${name} has no matching content`);
            return;
        }

        if (matchesTotal > MAX_NODES_PER_FACET_COUNT) {
            logger.critical(
                `Facet [${facetKey}] ${name} has more than the maximum allowed number of matches (${MAX_NODES_PER_FACET_COUNT})`
            );
        }

        const repoIdMatchesBuckets = sortMultiRepoNodeHitsToBuckets({ hits: matchesFromAllLayers });

        Object.entries(repoIdMatchesBuckets).forEach(([repoId, nodeIds]) => {
            if (!repoIdsToContentMaps[repoId]) {
                repoIdsToContentMaps[repoId] = {};
            }

            populateContentIdsToFacetsMap({
                facet,
                repoId,
                matchedContentIdsForFacet: nodeIds,
                contentIdsToFacetsMap: repoIdsToContentMaps[repoId],
            });
        });
    });

    return transformToArray(repoIdsToContentMaps);
};

let abortFlag = false;
export const revalidateAllSearchNodesAbort = () => {
    abortFlag = true;
};

export const revalidateAllSearchNodesSync = () => {
    abortFlag = false;
    const startTime = Date.now();
    logger.info(`Updating all search nodes!`);

    const config = getSearchConfig();
    if (!config) {
        logger.critical(`No search config found, could not update search nodes!`);
        return;
    }

    const contentWithMatchedFacets = getContentWithMatchingFacets(config);

    const searchRepoConnection = getSearchRepoConnection();

    const { sources, repoIdToLocaleMap } = getLayersData();
    const localeToRepoConnection = sources.master.reduce<Record<string, RepoConnection>>(
        (acc, source) => {
            const { repoId } = source;

            const locale = repoIdToLocaleMap[repoId];
            const repoConnection = getRepoConnection({ repoId, branch: 'master' });

            return { ...acc, [locale]: repoConnection };
        },
        {}
    );

    logger.info(
        `Found ${contentWithMatchedFacets.length} matching contents for facets, running updates`
    );

    let updateCounter = 0;
    const validSearchNodeIds: string[] = [];

    const wasCompleted = contentWithMatchedFacets.every(({ contentId, locale, facets }, index) => {
        if (index && index % 1000 === 0) {
            logger.info(
                `Processed search nodes for ${index}/${contentWithMatchedFacets.length} contents (${updateCounter} search nodes updated so far)`
            );
        }

        if (abortFlag) {
            logger.warning(`Abort flag was set, aborting search nodes update!`);
            abortFlag = false;
            return false;
        }

        const contentNode = localeToRepoConnection[locale]?.get<Content>(contentId);
        if (!contentNode) {
            logger.error(`Content not found for id ${contentId}!`);
            return true;
        }

        const { didUpdate, searchNodeId } = createOrUpdateSearchNode({
            contentNode,
            facets,
            searchRepoConnection,
            locale,
        });

        if (didUpdate) {
            updateCounter++;
        }
        if (searchNodeId) {
            validSearchNodeIds.push(searchNodeId);
        }

        return true;
    });

    if (!wasCompleted) {
        logger.warning(
            `Search nodes update was aborted after ${
                Date.now() - startTime
            }ms - ${updateCounter} nodes were updated`
        );
        return;
    }

    deleteInvalidNodes(validSearchNodeIds, searchRepoConnection);

    logger.info(
        `Updated ${updateCounter} search nodes from ${
            contentWithMatchedFacets.length
        } matched contents - total valid search nodes: ${validSearchNodeIds.length} - time spent: ${
            Date.now() - startTime
        }ms`
    );
};
