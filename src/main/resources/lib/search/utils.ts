import * as nodeLib from '/lib/xp/node';
import { RepoConnection } from '/lib/xp/node';
import { forceArray } from '../utils/nav-utils';
import { SEARCH_REPO_ID } from '../constants';
import { logger } from '../utils/logging';
import { ContentFacet } from '../../types/search';
import { ArrayOrSingle } from '../../types/util-types';
import { generateUUID } from '../utils/uuid';

export const SEARCH_REPO_DELETION_QUEUE_BASE_NODE = 'deletionQueue';
export const SEARCH_REPO_CONTENT_BASE_NODE = 'content';
export const SEARCH_REPO_UPDATE_STATE_NODE = 'updateState';
export const SEARCH_REPO_CONFIG_NODE = 'config';

export const SEARCH_REPO_CONTENT_ID_KEY = 'contentId';
export const SEARCH_REPO_CONTENT_PATH_KEY = 'contentPath';
export const SEARCH_REPO_FACETS_KEY = 'facets';

export const getSearchRepoConnection = () =>
    nodeLib.connect({
        repoId: SEARCH_REPO_ID,
        branch: 'master',
        user: {
            login: 'su',
        },
        principals: ['role:system.admin'],
    });

export const facetsAreEqual = (
    facets1: ArrayOrSingle<ContentFacet>,
    facets2: ArrayOrSingle<ContentFacet>
) => {
    const facetsArray1 = forceArray(facets1);
    const facetsArray2 = forceArray(facets2);

    return (
        facetsArray1.length === facetsArray2.length &&
        facetsArray1.every((f1) => {
            const ufArray1 = forceArray(f1.underfacets);
            return facetsArray2.some((f2) => {
                const ufArray2 = forceArray(f2.underfacets);
                return (
                    f1.facet === f2.facet &&
                    ufArray1.length === ufArray2.length &&
                    ufArray1.every((uf1) => ufArray2.some((uf2) => uf1 === uf2))
                );
            });
        })
    );
};

export const deleteSearchNode = (nodeId: string, repo: RepoConnection) => {
    try {
        // Move before deleting, as deletion is not a synchronous operation and we may
        // want the node path freed up immediately
        repo.move({
            source: nodeId,
            target: `/${SEARCH_REPO_DELETION_QUEUE_BASE_NODE}/${nodeId}-${generateUUID()}`,
        });

        repo.delete(nodeId);
    } catch (e) {
        logger.critical(`Failed to delete search node ${nodeId} - ${e}`);
    }
};

export const deleteSearchNodesForContent = (contentId: string) => {
    const searchRepoConnection = getSearchRepoConnection();

    searchRepoConnection
        .query({
            start: 0,
            count: 1000,
            filters: {
                hasValue: {
                    field: SEARCH_REPO_CONTENT_ID_KEY,
                    values: [contentId],
                },
            },
        })
        .hits.forEach((node) => {
            deleteSearchNode(node.id, searchRepoConnection);
        });
};
