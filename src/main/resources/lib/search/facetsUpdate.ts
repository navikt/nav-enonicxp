import contentLib, { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { contentRepo, searchRepo } from '../constants';
import nodeLib from '/lib/xp/node';
import { Facet, getFacetsConfig } from './facetsConfig';
import { fixDateFormat, forceArray } from '../utils/nav-utils';
import {
    searchRepoContentIdKey,
    searchRepoContentBaseNode,
    searchRepoContentPathKey,
    searchRepoDeletionQueueBaseNode,
    searchRepoFacetsKey,
} from './searchRepo';

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

export const updateFacetsForContent = (contentId: string) => {
    log.info(`Updating facets for id ${contentId}`);

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

    const contentNode = contentRepoConnection.get<Content>(contentId);
    if (!contentNode) {
        logger.info(`Content node not found for id ${contentId}`);
        return;
    }

    const newFacets = forceArray(facetsConfig.data.fasetter).reduce((acc, facet) => {
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

    const newSearchNode = searchRepoConnection.create({
        ...contentNode,
        [searchRepoFacetsKey]: newFacets,
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
    });

    if (!newSearchNode) {
        logger.critical(`Failed to create new search node for content ${contentId}`);
    }

    if (searchNodeId) {
        searchRepoConnection.delete(searchNodeId);
    }

    logger.info(`Updated facets for ${contentId}: ${JSON.stringify(newFacets)}`);
};
