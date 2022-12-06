import nodeLib, { RepoConnection } from '/lib/xp/node';
import contentLib, { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { getSearchConfig } from './config';
import { contentRepo } from '../constants';
import { forceArray } from '../utils/nav-utils';
import { batchedNodeQuery } from '../utils/batched-query';
import {
    createSearchNode,
    ContentFacet,
    getSearchRepoConnection,
    searchRepoContentBaseNode,
    ConfigFacet,
    searchRepoContentIdKey,
} from './utils';
import { getNodeVersions } from '../utils/version-utils';

const contentBasePath = `/${searchRepoContentBaseNode}`;

const deleteStaleNodes = (matchedIds: string[], repo: RepoConnection) => {
    const staleSearchNodes = batchedNodeQuery({
        queryParams: {
            start: 0,
            count: 50000,
            query: `_parentPath LIKE "${contentBasePath}*"`,
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
        repo,
    }).hits;

    if (staleSearchNodes.length > 0) {
        logger.info(`Found ${staleSearchNodes.length} stale search nodes - deleting`);

        staleSearchNodes.forEach((hit) => {
            repo.delete(hit.id);
        });
    }
};

const getPreviousConfig = (repo: RepoConnection, configId: string) => {
    const prevVersion = getNodeVersions({
        nodeKey: configId,
        repo,
        branch: 'master',
    })[1];

    if (!prevVersion) {
        return null;
    }

    const prevContent = contentLib.get({
        key: prevVersion.nodeId,
        versionId: prevVersion.versionId,
    });

    if (!prevContent || prevContent.type !== 'navno.nav.no.search:search-config2') {
        return null;
    }

    return prevContent;
};

const configFacetsAreEqual = (facet1: ConfigFacet, facet2: ConfigFacet) => {
    const ufArray1 = forceArray(facet1.underfasetter);
    const ufArray2 = forceArray(facet2.underfasetter);

    return (
        facet1.ruleQuery === facet2.ruleQuery &&
        ufArray1.length === ufArray2.length &&
        ufArray1.every((uf1) =>
            ufArray2.some((uf2) => uf1.facetKey === uf2.facetKey && uf1.ruleQuery === uf2.ruleQuery)
        )
    );
};

const hasAllSearchNodes = (
    query: string,
    contentIds: string[],
    searchRepoConnection: RepoConnection
) => {
    const existingSearchNodes = batchedNodeQuery({
        queryParams: {
            start: 0,
            count: 50000,
            query: query,
            filters: {
                hasValue: {
                    field: searchRepoContentIdKey,
                    values: contentIds,
                },
            },
        },
        repo: searchRepoConnection,
    }).hits;

    return existingSearchNodes.length === contentIds.length;
};

export const refreshSearchNodes = () => {
    logger.info(`Updating all search nodes!`);

    const config = getSearchConfig();
    if (!config) {
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

    const searchRepoConnection = getSearchRepoConnection();

    const newFacets = forceArray(config.data.fasetter);

    // const prevConfig = getPreviousConfig(contentRepoConnection, config._id);
    // const prevFacets = forceArray(prevConfig?.data.fasetter);

    const { toUpdate, toSkip } = newFacets.reduce(
        (acc, facet, index) => {
            if (index > 1) {
                return acc;
            }

            const { facetKey, name, ruleQuery, underfasetter } = facet;

            const matchedContentIds = batchedNodeQuery({
                queryParams: {
                    start: 0,
                    count: 50000,
                    query: ruleQuery,
                },
                repo: contentRepoConnection,
            }).hits.map((content) => content.id);

            // const prevFacet = prevFacets.find((prevFacet) => prevFacet.facetKey === facetKey);

            const ufArray = forceArray(underfasetter);

            if (ufArray.length === 0) {
                if (hasAllSearchNodes(ruleQuery, matchedContentIds, searchRepoConnection)) {
                    logger.info(
                        `Facet "${name}" with key "${facetKey}" was not changed - skipping updates`
                    );
                    acc.toSkip.push(...matchedContentIds);
                } else {
                    matchedContentIds.forEach((id) => {
                        if (!acc.toUpdate[id]) {
                            acc.toUpdate[id] = [];
                        }
                        acc.toUpdate[id].push({ facet: facetKey });
                    });
                }

                return acc;
            }

            const ufs = ufArray.reduce((acc, uf) => {
                const matchedContentIdsForUf = batchedNodeQuery({
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
                }).hits.map((node) => node.id);

                if (hasAllSearchNodes(uf.ruleQuery, matchedContentIdsForUf, searchRepoConnection)) {
                    logger.info(
                        `Underfacet "${name}" with key "${facetKey}" was not changed - skipping updates`
                    );
                    acc.toSkip.push(...matchedContentIdsForUf);
                } else {
                    matchedContentIdsForUf.forEach((contentId) => {
                        if (!acc[contentId]) {
                            acc[contentId] = [];
                        }
                        acc[contentId].push(uf.facetKey);
                    });
                }

                return acc;
            }, {} as Record<string, string[]>);

            Object.entries(ufs).forEach(([contentId, ufKeys]) => {
                if (!acc.toUpdate[contentId]) {
                    acc.toUpdate[contentId] = [];
                }
                acc.toUpdate[contentId].push({ facet: facetKey, underfacets: ufKeys });
            });

            return acc;
        },
        { toUpdate: {} as Record<string, ContentFacet[]>, toSkip: [] as string[] }
    );

    const idsToUpdate = Object.keys(toUpdate);

    const startTime = Date.now();
    logger.info(`Updating ${idsToUpdate.length} search nodes with new facets`);

    idsToUpdate.forEach((contentId) => {
        const contentNode = contentRepoConnection.get<Content>(contentId);
        if (!contentNode) {
            logger.error(`Content not found for id ${contentId}!`);
            return;
        }

        const facets = toUpdate[contentId];

        createSearchNode(contentNode, facets);
    });

    deleteStaleNodes([...idsToUpdate, ...toSkip], searchRepoConnection);

    logger.info(
        `Updated ${Object.keys(toUpdate).length} search nodes - time spent: ${
            Date.now() - startTime
        }ms`
    );
};
