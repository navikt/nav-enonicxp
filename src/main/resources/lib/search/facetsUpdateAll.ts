import nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { Facet, getFacetsConfig } from './facetsConfig';
import { contentRepo, searchRepo } from '../constants';
import { forceArray } from '../utils/nav-utils';
import { batchedNodeQuery } from '../utils/batched-query';
import { createSearchNode } from './searchUtils';
import { searchRepoContentBaseNode } from './searchRepo';

const deleteStaleNodes = (matchedIds: string[]) => {
    const searchRepoConnection = nodeLib.connect({
        repoId: searchRepo,
        branch: 'master',
        user: {
            login: 'su',
        },
        principals: ['role:system.admin'],
    });

    const staleSearchNodes = batchedNodeQuery({
        queryParams: {
            start: 0,
            count: 50000,
            query: `_parentPath LIKE "/${searchRepoContentBaseNode}*"`,
            filters: {
                boolean: {
                    mustNot: {
                        hasValue: {
                            field: 'contentId',
                            values: matchedIds,
                        },
                    },
                },
            },
        },
        repo: searchRepoConnection,
    }).hits;

    if (staleSearchNodes.length > 0) {
        log.info(`Found ${staleSearchNodes.length} stale search nodes - deleting`);

        staleSearchNodes.forEach((hit) => {
            searchRepoConnection.delete(hit.id);
        });
    }
};

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

    const facetsToUpdate = forceArray(facetsConfig.data.fasetter).reduce((acc, facet, index) => {
        const { facetKey, ruleQuery, underfasetter } = facet;
        if (index > 1) {
            return acc;
        }

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

    const matchedIds = Object.keys(facetsToUpdate);

    log.info(`Updating ${matchedIds.length} contents with new facets`);
    const startTime = Date.now();

    matchedIds.forEach((contentId) => {
        const contentNode = contentRepoConnection.get<Content>(contentId);
        if (!contentNode) {
            logger.error(`Content not found for id ${contentId}!`);
            return;
        }

        createSearchNode(contentNode, facetsToUpdate[contentId]);
    });

    deleteStaleNodes(matchedIds);

    log.info(
        `Updated ${Object.keys(facetsToUpdate).length} contents with new facets - time spent: ${
            Date.now() - startTime
        }ms`
    );
};
