import contentLib, { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { contentRepo } from '../constants';
import nodeLib from '/lib/xp/node';
import { getSearchConfig } from './config';
import { forceArray } from '../utils/nav-utils';
import { createSearchNode, Facet } from './utils';

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

export const updateFacetsForContent = (contentId: string) => {
    log.info(`Updating facets for id ${contentId}`);

    const facetsConfig = getSearchConfig();
    if (!facetsConfig) {
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

    const contentNode = contentRepoConnection.get<Content>(contentId);
    if (!contentNode) {
        logger.info(`Content node not found for id ${contentId}`);
        return;
    }

    const matchedFacets = forceArray(facetsConfig.data.fasetter).reduce((acc, facet) => {
        const { facetKey, ruleQuery, underfasetter } = facet;

        if (!isQueryMatchingContent(ruleQuery, contentId)) {
            return acc;
        }

        const ufArray = forceArray(underfasetter);
        if (ufArray.length === 0) {
            return [...acc, { facet: facetKey, underfacets: [] }];
        }

        const underfacetsMatched = ufArray.reduce((acc, uf) => {
            if (!isQueryMatchingContent(uf.ruleQuery, contentId)) {
                return acc;
            }

            return [...acc, uf.facetKey];
        }, [] as string[]);

        // If the facet has underfacets, at least one underfacet must match along with the main facet
        if (underfacetsMatched.length === 0) {
            return acc;
        }

        return [...acc, { facet: facetKey, underfacets: underfacetsMatched }];
    }, [] as Facet[]);

    createSearchNode(contentNode, matchedFacets);
};
