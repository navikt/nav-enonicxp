import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import * as nodeLib from '/lib/xp/node';
import { getSearchConfig } from './config';
import { forceArray, stringArrayToSet } from '../utils/nav-utils';
import {
    createOrUpdateSearchNode,
    deleteSearchNodesForContent,
    getSearchRepoConnection,
    searchRepoContentIdKey,
} from './utils';
import { ContentFacet, SearchNode } from '../../types/search';

const isQueryMatchingContent = (query: string, id: string) =>
    contentLib.query({
        start: 0,
        count: 0,
        query,
        filters: {
            ids: {
                values: [id],
            },
        },
    }).total > 0;

export const updateSearchNode = (contentId: string) => {
    logger.info(`Updating search node for content id ${contentId}`);

    const searchConfig = getSearchConfig();
    if (!searchConfig) {
        return;
    }

    const contentTypesAllowedSet = stringArrayToSet(
        forceArray(getSearchConfig()?.data.contentTypes)
    );

    const contentRepoConnection = nodeLib.connect({
        repoId: CONTENT_ROOT_REPO_ID,
        branch: 'master',
        user: {
            login: 'su',
        },
        principals: ['role:system.admin'],
    });

    const contentNode = contentRepoConnection.get<Content>(contentId);
    if (!contentNode || !contentTypesAllowedSet[contentNode.type]) {
        logger.info(`No valid content found for id ${contentId}`);
        deleteSearchNodesForContent(contentId);
        return;
    }

    const matchedFacets = forceArray(searchConfig.data.fasetter).reduce((acc, facet) => {
        const { facetKey, ruleQuery, underfasetter } = facet;

        if (!isQueryMatchingContent(ruleQuery, contentId)) {
            return acc;
        }

        const ufArray = forceArray(underfasetter);
        if (ufArray.length === 0) {
            return [...acc, { facet: facetKey, underfacets: [] }];
        }

        const ufsMatched = ufArray.filter((uf) => isQueryMatchingContent(uf.ruleQuery, contentId));

        // If the facet has underfacets, at least one underfacet must match along with the main facet
        if (ufsMatched.length === 0) {
            return acc;
        }

        return [...acc, { facet: facetKey, underfacets: ufsMatched.map((uf) => uf.facetKey) }];
    }, [] as ContentFacet[]);

    const searchRepoConnection = getSearchRepoConnection();

    const existingSearchNodeIds = searchRepoConnection
        .query({
            start: 0,
            count: 100,
            filters: {
                hasValue: {
                    field: searchRepoContentIdKey,
                    values: [contentId],
                },
            },
        })
        .hits.map((hit) => hit.id);

    const existingSearchNodes = forceArray(
        searchRepoConnection.get<SearchNode>(existingSearchNodeIds) || []
    );

    createOrUpdateSearchNode({
        contentNode,
        facets: matchedFacets,
        existingSearchNodes: existingSearchNodes,
        searchRepoConnection: searchRepoConnection,
    });
};
