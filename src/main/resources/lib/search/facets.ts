import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import { logger } from '../utils/logging';
import { contentRepo } from '../constants';
import nodeLib from '/lib/xp/node';
import { getFacetsConfig } from './facetsConfig';
import { forceArray } from '../utils/nav-utils';
import contentLib from '/lib/xp/content';
import { facetsAreEqual } from './facetsCompare';

const isRuleMatchingContent = (query: string, id: string) => {
    return !!contentLib.query({
        start: 0,
        count: 1,
        query,
        filters: {
            ids: {
                values: [id],
            },
        },
    }).hits[0];
};

const updateFacets = (id: string) => {
    const repo = nodeLib.connect({
        repoId: contentRepo,
        branch: 'draft',
        user: {
            login: 'su',
        },
        principals: ['role:system.admin'],
    });

    const contentNode = repo.get(id);
    if (!contentNode) {
        logger.info(`Node not found for id ${id}`);
        return;
    }

    if (contentNode.workflow?.state !== 'READY') {
        logger.info('Node not ready, aborting');
        return;
    }

    const xDataFacets = contentNode.x?.['no-nav-navno']?.fasetter;
    if (!xDataFacets) {
        logger.info(`Facets not enabled for node ${id}`);
        return;
    }

    const facetsConfig = getFacetsConfig();

    const facets = forceArray(facetsConfig?.data.fasetter).reduce((acc, facet) => {
        const { facetKey, ruleQuery, underfasetter } = facet;

        if (!isRuleMatchingContent(ruleQuery, id)) {
            return acc;
        }

        const ufArray = forceArray(underfasetter);
        if (ufArray.length === 0) {
            return [...acc, { facet: facetKey, underfacets: [] }];
        }

        const underfacetsMatched = ufArray.reduce((acc, uf) => {
            if (!isRuleMatchingContent(`(${ruleQuery}) AND (${uf.ruleQuery})`, id)) {
                return acc;
            }

            return [...acc, uf.facetKey];
        }, [] as string[]);

        // If the facet has underfacets, at least one underfacet must match along with the main facet
        if (underfacetsMatched.length === 0) {
            return acc;
        }

        return [...acc, { facet: facetKey, underfacets: underfacetsMatched }];
    }, [] as Array<{ facet: string; underfacets: string[] }>);

    logger.info(`Found facets: ${JSON.stringify(facets)}`);

    const existingFacets = xDataFacets.facets;
    if (facetsAreEqual(existingFacets, facets)) {
        logger.info(`No changes detected, aborting`);
        return;
    }

    repo.modify({
        key: id,
        editor: (node) => {
            node.x['no-nav-navno'].fasetter.facets = facets;

            return node;
        },
    });
};

export const activateFacetsEventListener2 = () => {
    eventLib.listener({
        type: 'node.updated',
        callback: (event) => {
            if (!clusterLib.isMaster()) {
                return;
            }

            event.data.nodes.forEach((node) => {
                if (node.repo !== contentRepo || node.branch !== 'draft') {
                    return;
                }
                logger.info(`Node event: ${JSON.stringify(node)}`);

                updateFacets(node.id);
            });
        },
        localOnly: false,
    });

    logger.info('Started: facet-handler listening on node.pushed');
};
