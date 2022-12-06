import nodeLib, { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { fixDateFormat, forceArray } from '../utils/nav-utils';
import { searchRepo } from '../constants';
import { logger } from '../utils/logging';
import { SearchConfig } from '../../types/content-types/search-config';

export type ContentFacet = {
    facet: string;
    underfacets?: string[];
};

export type ConfigFacet = SearchConfig['fasetter'][number];

export const searchRepoDeletionQueueBaseNode = 'deletionQueue';
export const searchRepoContentBaseNode = 'content';
export const searchRepoContentIdKey = 'contentId';
export const searchRepoContentPathKey = 'contentPath';
export const searchRepoFacetsKey = 'facets';

export const getSearchRepoConnection = () =>
    nodeLib.connect({
        repoId: searchRepo,
        branch: 'master',
        user: {
            login: 'su',
        },
        principals: ['role:system.admin'],
    });

export const facetsAreEqual = (
    facets1: ContentFacet | ContentFacet[],
    facets2: ContentFacet | ContentFacet[]
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

const searchNodeTransformer = (contentNode: RepoNode<Content>, facets: ContentFacet[]) => {
    return {
        ...contentNode,
        [searchRepoFacetsKey]: facets,
        [searchRepoContentIdKey]: contentNode._id,
        [searchRepoContentPathKey]: contentNode._path,
        _name: contentNode._path.replace(/\//g, '_'),
        _parentPath: `/${searchRepoContentBaseNode}`,
        ...(contentNode.createdTime && {
            createdTime: new Date(fixDateFormat(contentNode.createdTime)),
        }),
        ...(contentNode.modifiedTime && {
            modifiedTime: new Date(fixDateFormat(contentNode.modifiedTime)),
        }),
        publish: {
            ...(contentNode.publish?.first && {
                first: new Date(fixDateFormat(contentNode.publish.first)),
            }),
            ...(contentNode.publish?.from && {
                from: new Date(fixDateFormat(contentNode.publish.from)),
            }),
            ...(contentNode.publish?.to && {
                to: new Date(fixDateFormat(contentNode.publish.to)),
            }),
        },
    };
};

export const createSearchNode = (contentNode: RepoNode<Content>, facets: ContentFacet[]) => {
    const contentId = contentNode._id;

    const searchRepoConnection = getSearchRepoConnection();

    const searchNodeId = searchRepoConnection.query({
        start: 0,
        count: 1,
        filters: {
            hasValue: {
                field: searchRepoContentIdKey,
                values: [contentId],
            },
        },
    }).hits[0]?.id;

    if (searchNodeId) {
        const searchNode = searchRepoConnection.get(searchNodeId);
        if (
            searchNode &&
            facetsAreEqual(facets, searchNode.facets) &&
            fixDateFormat(contentNode.modifiedTime) === searchNode.modifiedTime
        ) {
            // logger.info(`Content node for ${contentNode._path} is unchanged, skipping`);
            return;
        }

        // log.info(`Search node for ${contentId} already exists, queueing for removal`);
        searchRepoConnection.move({
            source: searchNodeId,
            target: `/${searchRepoDeletionQueueBaseNode}/`,
        });
    }

    const newSearchNode = searchRepoConnection.create(searchNodeTransformer(contentNode, facets));

    if (!newSearchNode) {
        logger.critical(`Failed to create new search node for content ${contentId}`);
    }

    if (searchNodeId) {
        searchRepoConnection.delete(searchNodeId);
    }

    logger.info(
        `Created search node for ${contentNode._path} with facets ${JSON.stringify(facets)}`
    );
};
