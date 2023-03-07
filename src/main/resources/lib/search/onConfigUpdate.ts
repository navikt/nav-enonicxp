import { getRepoConnection } from '../utils/repo-connection';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { getSearchConfig } from './config';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { batchedMultiRepoNodeQuery, batchedNodeQuery } from '../utils/batched-query';
import { getSearchRepoConnection, SEARCH_REPO_CONTENT_BASE_NODE } from './search-utils';
import { ContentFacet } from '../../types/search';
import { ConfigFacet, SearchConfigDescriptor } from '../../types/content-types/search-config';
import { createOrUpdateSearchNode } from './createOrUpdateSearchNode';
import { forceArray } from '../utils/array-utils';
import {
    getLayersMultiConnection,
    sortMultiRepoNodeHitIdsToRepoIdBuckets,
} from '../localization/locale-utils';
import { getLayersData } from '../localization/layers-data';

type ContentIdsToFacetsMap = Record<string, ContentFacet[]>;
type RepoIdsToContentMap = Record<string, ContentIdsToFacetsMap>;
type ContentIdWithMatchedFacets = { contentId: string; locale: string; facets: ContentFacet[] };

// Remove any existing search nodes which no longer points to content
// that should be indexed by the search
// TODO: FIX
const deleteInvalidNodes = (searchableContentIds: ContentIdWithMatchedFacets[]) => {
    const searchRepoConnection = getSearchRepoConnection();

    const invalidSearchNodes = batchedNodeQuery({
        queryParams: {
            start: 0,
            count: 50000,
            query: `_parentPath LIKE "/${SEARCH_REPO_CONTENT_BASE_NODE}*"`,
            filters: {
                boolean: {
                    mustNot: {
                        hasValue: {
                            field: 'contentId',
                            values: searchableContentIds.map(({ contentId }) => contentId),
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

const transformToArray = (repoIdsToContent: RepoIdsToContentMap) => {
    const { repoIdToLocaleMap } = getLayersData();

    return Object.entries(repoIdsToContent).reduce<ContentIdWithMatchedFacets[]>(
        (acc, [repoId, contentIdsToFacets]) => {
            const locale = repoIdToLocaleMap[repoId];

            Object.entries(contentIdsToFacets).forEach(([contentId, facets]) => {
                acc.push({ contentId, locale, facets });
            });

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
            `Facet [${facetKey}] ${name} matched ${matchedContentIdsForFacet.length} content nodes`
        );
        return;
    }

    const repoConnection = getRepoConnection({ branch: 'master', repoId });

    const contentIdsToUnderfacets = underfacets.reduce<Record<string, string[]>>((acc, uf) => {
        const ufMatches = batchedNodeQuery({
            queryParams: {
                start: 0,
                count: 50000,
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
            logger.info(`Underfacet ${ufLogString} has no matching content`);
            return acc;
        }

        logger.info(`Underfacet ${ufLogString} matched ${ufMatches.length} content nodes`);

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

        const matchesFromAllLayers = batchedMultiRepoNodeQuery({
            queryParams: {
                start: 0,
                count: 50000,
                query: ruleQuery,
                filters: {
                    hasValue: {
                        field: 'type',
                        values: contentTypes,
                    },
                },
            },
            repo: layersMultiRepoConnection,
        }).hits;

        if (matchesFromAllLayers.length === 0) {
            logger.info(`Facet [${facetKey}] ${name} has no matching content`);
            return;
        }

        const repoIdMatchesBuckets = sortMultiRepoNodeHitIdsToRepoIdBuckets(matchesFromAllLayers);

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

export const revalidateAllSearchNodes = () => {
    abortFlag = false;
    const startTime = Date.now();
    logger.info(`Updating all search nodes!`);

    const config = getSearchConfig();
    if (!config) {
        logger.critical(`No search config found, could not update search nodes!`);
        return;
    }

    const contentRepoConnection = getRepoConnection({
        repoId: CONTENT_ROOT_REPO_ID,
        branch: 'master',
        asAdmin: true,
    });

    const contentWithMatchedFacets = getContentWithMatchingFacets(config);

    logger.info(
        `Found ${contentWithMatchedFacets.length} matching contents for facets, running updates`
    );

    const searchRepoConnection = getSearchRepoConnection();

    let counter = 0;

    const wasCompleted = contentWithMatchedFacets.every(({ contentId, locale, facets }, index) => {
        if (index && index % 1000 === 0) {
            logger.info(
                `Processed search nodes for ${index}/${contentWithMatchedFacets.length} contents (${counter} search nodes updated so far)`
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

        const didUpdate = createOrUpdateSearchNode({
            contentNode,
            facets,
            searchRepoConnection,
            locale,
        });

        if (didUpdate) {
            counter++;
        }

        return true;
    });

    if (!wasCompleted) {
        logger.warning(
            `Search nodes update was aborted after ${
                Date.now() - startTime
            }ms - ${counter} nodes were updated`
        );
        return;
    }

    deleteInvalidNodes(contentWithMatchedFacets);

    logger.info(
        `Updated ${counter} search nodes from ${
            contentWithMatchedFacets.length
        } matched contents - time spent: ${Date.now() - startTime}ms`
    );
};
