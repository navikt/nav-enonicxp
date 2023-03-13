import { RepoConnection, RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { ContentFacet, SearchNode, SearchNodeCreateParams } from '../../types/search';
import { logger } from '../utils/logging';
import {
    deleteSearchNode,
    facetsAreEqual,
    getSearchRepoConnection,
    querySearchNodesForContent,
    SEARCH_REPO_CONTENT_BASE_NODE,
} from './search-utils';
import { generateUUID } from '../utils/uuid';
import { getPublicPath } from '../paths/public-path';
import { URLS } from '../constants';
import { dateTimesAreEqual, fixDateFormat } from '../utils/datetime-utils';
import { forceArray } from '../utils/array-utils';

const SEARCH_REPO_CONTENT_PARENT_PATH = `/${SEARCH_REPO_CONTENT_BASE_NODE}`;

const getHref = (content: Content, locale: string) => {
    if (
        content.type === 'navno.nav.no.search:search-api2' ||
        content.type === 'no.nav.navno:external-link'
    ) {
        return content.data.url;
    }

    return `${URLS.FRONTEND_ORIGIN}${getPublicPath(content, locale)}`;
};

// Note: datetimes must be provided as Date-objects with a format accepted by Nashorn
// in order for the datetime to be indexed as the correct type
const transformContentToSearchNodeParams = (
    contentNode: RepoNode<Content>,
    facets: ContentFacet[],
    locale: string
): SearchNodeCreateParams => {
    const { createdTime, modifiedTime, publish, ...rest } = contentNode;

    // Add a uuid to prevent name collisions
    const name = `${contentNode._path.replace(/\//g, '_')}-${locale}-${generateUUID()}`;

    return {
        ...rest,
        facets: facets,
        contentId: contentNode._id,
        contentPath: contentNode._path,
        href: getHref(contentNode, locale),
        layerLocale: locale,
        _name: name,
        _parentPath: SEARCH_REPO_CONTENT_PARENT_PATH,
        ...(createdTime && {
            createdTime: new Date(fixDateFormat(contentNode.createdTime)),
        }),
        ...(modifiedTime && {
            modifiedTime: new Date(fixDateFormat(contentNode.modifiedTime)),
        }),
        publish: {
            ...(publish?.first && {
                first: new Date(fixDateFormat(publish.first)),
            }),
            ...(publish?.from && {
                from: new Date(fixDateFormat(publish.from)),
            }),
            ...(publish?.to && {
                to: new Date(fixDateFormat(publish.to)),
            }),
        },
    };
};

const searchNodeIsFresh = (
    searchNode: SearchNode,
    contentNode: Content,
    facets: ContentFacet[],
    locale: string
) =>
    facetsAreEqual(facets, searchNode.facets) &&
    dateTimesAreEqual(contentNode.modifiedTime, searchNode.modifiedTime) &&
    searchNode.contentId === contentNode._id &&
    searchNode.contentPath === contentNode._path &&
    searchNode.layerLocale === locale &&
    searchNode.href === getHref(contentNode, locale);

const getExistingSearchNodes = (
    contentId: string,
    locale: string,
    searchRepoConnection: RepoConnection
) => {
    const existingSearchNodeIds = querySearchNodesForContent(contentId, locale).hits.map(
        (hit) => hit.id
    );

    if (existingSearchNodeIds.length === 0) {
        return [];
    }

    const existingSearchNodes = searchRepoConnection.get<SearchNode>(existingSearchNodeIds);

    return existingSearchNodes ? forceArray(existingSearchNodes) : [];
};

type UpdateResult = {
    didUpdate: boolean; // true if a search node was successfully created or updated
    searchNodeId?: string; // the _id of the search node for the content, if it exists
};

export const createOrUpdateSearchNode = ({
    contentNode,
    facets = [],
    locale,
    searchRepoConnection = getSearchRepoConnection(),
}: {
    contentNode: RepoNode<Content>;
    facets: ContentFacet[];
    locale: string;
    searchRepoConnection?: RepoConnection;
}): UpdateResult => {
    const existingSearchNodes = getExistingSearchNodes(
        contentNode._id,
        locale,
        searchRepoConnection
    );

    if (facets.length === 0) {
        existingSearchNodes.forEach((node) => {
            deleteSearchNode(node._id, searchRepoConnection);
        });
        return { didUpdate: false };
    }

    const searchNodeParams = transformContentToSearchNodeParams(contentNode, facets, locale);

    const { contentPath, contentId } = searchNodeParams;

    const contentLogString = `[${contentId}][${locale}] ${contentPath}`;

    if (existingSearchNodes.length === 1) {
        const searchNode = existingSearchNodes[0];

        if (searchNodeIsFresh(searchNode, contentNode, facets, locale)) {
            return { didUpdate: false, searchNodeId: searchNode._id };
        }

        searchRepoConnection.modify({
            key: searchNode._id,
            editor: () => searchNodeParams,
        });
        return { didUpdate: true, searchNodeId: searchNode._id };
    } else if (existingSearchNodes.length > 1) {
        // If multiple search nodes exists for a content, something has gone wrong at some point
        // in the past. Remove everything, log that the problem has occured and create a new node.
        logger.critical(
            `Multiple existing search nodes found for ${contentLogString} - ${existingSearchNodes
                .map((node) => node._id)
                .join(', ')}`
        );

        existingSearchNodes.forEach((node) => {
            deleteSearchNode(node._id, searchRepoConnection);
        });
    }

    try {
        const newSearchNode = searchRepoConnection.create(searchNodeParams);
        if (!newSearchNode) {
            logger.critical(`Failed to create search node for content ${contentLogString}`);
            return { didUpdate: false };
        }

        logger.info(
            `Created search node for content ${contentLogString} with facets ${JSON.stringify(
                facets
            )}`
        );
        return { didUpdate: true, searchNodeId: newSearchNode._id };
    } catch (e) {
        logger.critical(`Error while creating search node for content ${contentLogString} - ${e}`);
        return { didUpdate: false };
    }
};
