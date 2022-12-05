import nodeLib, { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import {
    searchRepoContentBaseNode,
    searchRepoContentIdKey,
    searchRepoContentPathKey,
    searchRepoDeletionQueueBaseNode,
    searchRepoFacetsKey,
} from './searchRepo';
import { fixDateFormat } from '../utils/nav-utils';
import { Facet } from './facetsConfig';
import { searchRepo } from '../constants';
import { logger } from '../utils/logging';

const searchNodeTransformer = (contentNode: RepoNode<Content>, facets: Facet[]) => {
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

export const createSearchNode = (contentNode: RepoNode<Content>, facets: Facet[]) => {
    const contentId = contentNode._id;

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
                field: searchRepoContentIdKey,
                values: [contentId],
            },
        },
    }).hits[0]?.id;

    if (searchNodeId) {
        log.info(`Search node for ${contentId} already exists, queueing for removal`);
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
