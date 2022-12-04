import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import contentLib, { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { contentRepo, searchRepo } from '../constants';
import nodeLib from '/lib/xp/node';
import { Facet, getFacetsConfig } from './facetsConfig';
import { forceArray } from '../utils/nav-utils';
import { batchedNodeQuery } from '../utils/batched-query';

const isQueryMatchingContent = (query: string, id: string) =>
    !!contentLib.query({
        start: 0,
        count: 1,
        query,
        filters: {
            ids: {
                values: [id],
            },
        },
    }).hits[0];

const updateFacets = (id: string) => {
    log.info(`Updating facets for id ${id}`);

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

    const contentNode = contentRepoConnection.get<Content>(id);
    if (!contentNode) {
        logger.info(`Content node not found for id ${id}`);
        return;
    }

    const facets = forceArray(facetsConfig.data.fasetter).reduce((acc, facet) => {
        const { facetKey, ruleQuery, underfasetter } = facet;

        if (!isQueryMatchingContent(ruleQuery, id)) {
            return acc;
        }

        const ufArray = forceArray(underfasetter);
        if (ufArray.length === 0) {
            return [...acc, { facet: facetKey, underfacets: [] }];
        }

        const underfacetsMatched = ufArray.reduce((acc, uf) => {
            if (!isQueryMatchingContent(uf.ruleQuery, id)) {
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

    const searchRepoConnection = nodeLib.connect({
        repoId: searchRepo,
        branch: 'master',
        user: {
            login: 'su',
        },
        principals: ['role:system.admin'],
    });

    const searchNodeId = searchRepoConnection.query({
        start: 0,
        count: 1,
        filters: {
            hasValue: {
                field: 'baseId',
                values: [id],
            },
        },
    }).hits[0]?.id;

    if (searchNodeId) {
        log.info(`Search node for ${id} already exists, queueing for removal`);
        searchRepoConnection.move({
            source: searchNodeId,
            target: '/_deletionQueue/',
        });
    }

    searchRepoConnection.create({
        ...contentNode,
        baseId: id,
        basePath: contentNode._path,
        _name: contentNode._path.replace(/\//g, '_'),
    });

    if (searchNodeId) {
        searchRepoConnection.delete(searchNodeId);
    }

    logger.info(`Updated facets for ${id}: ${JSON.stringify(facets)}`);
};

const updateAllFacets = () => {
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

export const activateFacetsUpdateHandler = () => {
    const facetsConfig = getFacetsConfig();
    if (!facetsConfig) {
        logger.critical(`No facets config found!`);
        return;
    }

    const facetsConfigId = facetsConfig._id;

    eventLib.listener({
        type: 'node.pushed',
        callback: (event) => {
            if (!clusterLib.isMaster()) {
                return;
            }

            event.data.nodes.forEach((nodeData) => {
                if (nodeData.repo !== contentRepo || nodeData.branch !== 'master') {
                    return;
                }

                if (nodeData.id === facetsConfigId) {
                    updateAllFacets();
                    return;
                }

                updateFacets(nodeData.id);
            });
        },
        localOnly: false,
    });

    logger.info('Started event listener for facets updates');
};
