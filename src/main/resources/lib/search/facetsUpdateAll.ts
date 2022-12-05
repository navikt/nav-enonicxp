import nodeLib from '/lib/xp/node';
import { logger } from '../utils/logging';
import { Facet, getFacetsConfig } from './facetsConfig';
import { contentRepo } from '../constants';
import { forceArray } from '../utils/nav-utils';
import { batchedNodeQuery } from '../utils/batched-query';

export const updateAllFacets = () => {
    logger.info(`Updating all facets!`);

    const facetsConfig = getFacetsConfig();
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

    const toUpdate = forceArray(facetsConfig.data.fasetter).reduce((acc, facet) => {
        const { facetKey, ruleQuery, underfasetter } = facet;

        const matchedContentIds = batchedNodeQuery({
            queryParams: {
                start: 0,
                count: 50000,
                query: ruleQuery,
            },
            repo: contentRepoConnection,
        }).hits.map((content) => content.id);

        const ufArray = forceArray(underfasetter);
        if (ufArray.length === 0) {
            matchedContentIds.forEach((id) => {
                if (!acc[id]) {
                    acc[id] = [];
                }
                acc[id].push({ facet: facetKey });
            });
            return acc;
        }

        const ufs = ufArray.reduce((acc, uf) => {
            const contentUfMatched = batchedNodeQuery({
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
            }).hits;

            contentUfMatched.forEach(({ id }) => {
                if (!acc[id]) {
                    acc[id] = [];
                }
                acc[id].push(uf.facetKey);
            });

            return acc;
        }, {} as { [id: string]: string[] });

        Object.entries(ufs).forEach(([contentId, ufKeys]) => {
            if (!acc[contentId]) {
                acc[contentId] = [];
            }
            acc[contentId].push({ facet: facetKey, underfacets: ufKeys });
        });

        return acc;
    }, {} as { [id: string]: Facet[] });

    log.info(`Updating ${Object.keys(toUpdate).length} contents with new facets!`);

    Object.entries(toUpdate).forEach(([contentId, facets], index) => {
        if (index % 2000 !== 0) {
            return;
        }

        const contentNode = contentRepoConnection.get(contentId);
        log.info(
            `Setting facets on ${contentNode.type} on path ${contentNode._path} id ${contentNode._id}`
        );

        contentRepoConnection.modify({
            key: contentId,
            editor: (node) => {
                node.x['no-nav-navno'].fasetter.facets = facets;
                return node;
            },
        });
    });
};
