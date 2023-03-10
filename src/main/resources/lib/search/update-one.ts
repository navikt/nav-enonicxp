import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-connection';
import { logger } from '../utils/logging';
import { getSearchConfig } from './config';
import { deleteSearchNodesForContent } from './search-utils';
import { ContentFacet } from '../../types/search';
import { isContentLocalized } from '../localization/locale-utils';
import { runInLocaleContext } from '../localization/locale-context';
import { getLayersData } from '../localization/layers-data';
import { createOrUpdateSearchNode } from './create-or-update-search-node';
import { forceArray, stringArrayToSet } from '../utils/array-utils';
import { isArchivedContentNode } from '../utils/content-utils';

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
    logger.info(`Updating search node for content id ${contentId} in ${repoId}`);

    const searchConfig = getSearchConfig();
    if (!searchConfig) {
        return;
    }

    const contentTypesAllowedSet = stringArrayToSet(forceArray(searchConfig.data.contentTypes));

    const contentRepoConnection = getRepoConnection({
        repoId,
        branch: 'master',
        asAdmin: true,
    });

    const contentLocale = getLayersData().repoIdToLocaleMap[repoId];
    const contentNode = contentRepoConnection.get<Content>(contentId);

    if (
        !contentNode ||
        !contentTypesAllowedSet[contentNode.type] ||
        !isContentLocalized(contentNode) ||
        isArchivedContentNode(contentNode)
    ) {
        logger.info(`No valid content found for id ${contentId} in ${repoId}`);
        deleteSearchNodesForContent(contentId, contentLocale);
        return;
    }

    const matchedFacets = forceArray(searchConfig.data.fasetter).reduce((acc, facet) => {
        const { facetKey, ruleQuery, underfasetter } = facet;

        if (!isQueryMatchingContent(ruleQuery, contentId, contentLocale)) {
            return acc;
        }

        const ufArray = forceArray(underfasetter);
        if (ufArray.length === 0) {
            return [...acc, { facet: facetKey, underfacets: [] }];
        }

        const ufsMatched = ufArray.filter((uf) =>
            isQueryMatchingContent(uf.ruleQuery, contentId, contentLocale)
        );

        // If the facet has underfacets, at least one underfacet must match along with the main facet
        if (ufsMatched.length === 0) {
            return acc;
        }

        return [...acc, { facet: facetKey, underfacets: ufsMatched.map((uf) => uf.facetKey) }];
    }, [] as ContentFacet[]);

    createOrUpdateSearchNode({
        contentNode,
        facets: matchedFacets,
        locale: contentLocale,
    });
};
