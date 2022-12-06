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
} from './utils';
import { getNodeVersions } from '../utils/version-utils';

const contentBasePath = `/${searchRepoContentBaseNode}`;

const deleteStaleNodes = (matchedIds: string[]) => {
    const repo = getSearchRepoConnection();

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
        log.info(`Found ${staleSearchNodes.length} stale search nodes - deleting`);

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

export const updateAllFacets = () => {
    logger.info(`Updating all facets!`);

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

    const newFacets = forceArray(config.data.fasetter);

    const prevConfig = getPreviousConfig(contentRepoConnection, config._id);
    const prevFacets = forceArray(prevConfig?.data.fasetter);

    const { toUpdate, toSkip } = newFacets.reduce(
        (acc, facet, index) => {
            const { facetKey, name, ruleQuery, underfasetter } = facet;
            // TODO: remove this
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

            const prevFacet = prevFacets.find((prevFacet) => prevFacet.facetKey === facetKey);
            if (prevFacet && configFacetsAreEqual(facet, prevFacet)) {
                logger.info(
                    `Facet "${name}" with key "${facetKey}" was not changed - skipping updates`
                );
                acc.toSkip.push(...matchedContentIds);
                return acc;
            }

            const ufArray = forceArray(underfasetter);
            if (ufArray.length === 0) {
                matchedContentIds.forEach((id) => {
                    if (!acc.toUpdate[id]) {
                        acc.toUpdate[id] = [];
                    }
                    acc.toUpdate[id].push({ facet: facetKey });
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
    log.info(`Updating ${idsToUpdate.length} contents with new facets`);

    idsToUpdate.forEach((contentId) => {
        const contentNode = contentRepoConnection.get<Content>(contentId);
        if (!contentNode) {
            logger.error(`Content not found for id ${contentId}!`);
            return;
        }

        createSearchNode(contentNode, toUpdate[contentId]);
    });

    deleteStaleNodes([...idsToUpdate, ...toSkip]);

    log.info(
        `Updated ${Object.keys(toUpdate).length} contents with new facets - time spent: ${
            Date.now() - startTime
        }ms`
    );
};
