import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-connection';
import { logger } from '../utils/logging';
import { getSearchConfig } from './config';
import { forceArray, stringArrayToSet } from '../utils/nav-utils';
import {
    deleteSearchNodesForContent,
    getSearchRepoConnection,
    SEARCH_REPO_CONTENT_ID_KEY,
} from './search-utils';
import { ContentFacet, SearchNode } from '../../types/search';
import { isContentLocalized } from '../localization/locale-utils';
import { runInLocaleContext } from '../localization/locale-context';
import { getLayersData } from '../localization/layers-data';
import { createOrUpdateSearchNode } from './createOrUpdateSearchNode';

const isQueryMatchingContent = (query: string, contentId: string, locale: string) =>
    runInLocaleContext(
        { locale },
        () =>
            contentLib.query({
                start: 0,
                count: 0,
                query,
                filters: {
                    ids: {
                        values: [contentId],
                    },
                },
            }).total > 0
    );

export const updateSearchNode = (contentId: string, repoId: string) => {
    logger.info(`Updating search node for content id ${contentId} in repo ${repoId}`);

    const searchConfig = getSearchConfig();
    if (!searchConfig) {
        return;
    }

    const contentTypesAllowedSet = stringArrayToSet(
        forceArray(getSearchConfig()?.data.contentTypes)
    );

    const contentRepoConnection = getRepoConnection({
        repoId,
        branch: 'master',
        asAdmin: true,
    });

    const contentNode = contentRepoConnection.get<Content>(contentId);
    if (
        !contentNode ||
        !contentTypesAllowedSet[contentNode.type] ||
        !isContentLocalized(contentNode)
    ) {
        logger.info(`No valid content found for id ${contentId}`);
        deleteSearchNodesForContent(contentId);
        return;
    }

    const locale = getLayersData().repoIdToLocaleMap[repoId];

    const matchedFacets = forceArray(searchConfig.data.fasetter).reduce((acc, facet) => {
        const { facetKey, ruleQuery, underfasetter } = facet;

        if (!isQueryMatchingContent(ruleQuery, contentId, locale)) {
            return acc;
        }

        const ufArray = forceArray(underfasetter);
        if (ufArray.length === 0) {
            return [...acc, { facet: facetKey, underfacets: [] }];
        }

        const ufsMatched = ufArray.filter((uf) =>
            isQueryMatchingContent(uf.ruleQuery, contentId, locale)
        );

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
                    field: SEARCH_REPO_CONTENT_ID_KEY,
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
        locale,
    });
};
