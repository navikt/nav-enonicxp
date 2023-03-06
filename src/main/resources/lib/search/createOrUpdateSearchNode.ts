import { RepoConnection, RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { ContentFacet, SearchNode, SearchNodeCreateParams } from '../../types/search';
import { logger } from '../utils/logging';
import {
    deleteSearchNode,
    facetsAreEqual,
    SEARCH_REPO_CONTENT_BASE_NODE,
    SEARCH_REPO_CONTENT_ID_KEY,
    SEARCH_REPO_CONTENT_PATH_KEY,
    SEARCH_REPO_FACETS_KEY,
    SEARCH_REPO_HREF_KEY,
    SEARCH_REPO_LOCALE_KEY,
} from './search-utils';
import { generateUUID } from '../utils/uuid';
import { getPublicPath } from '../paths/public-path';
import { URLS } from '../constants';
import { dateTimesAreEqual, fixDateFormat } from '../utils/datetime-utils';

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
const searchNodeTransformer = (
    contentNode: RepoNode<Content>,
    facets: ContentFacet[],
    locale: string
): SearchNodeCreateParams => {
    const { createdTime, modifiedTime, publish, ...rest } = contentNode;

    // Add a uuid to prevent name collisions
    const name = `${contentNode._path.replace(/\//g, '_')}-${generateUUID()}`;

    return {
        ...rest,
        [SEARCH_REPO_FACETS_KEY]: facets,
        [SEARCH_REPO_CONTENT_ID_KEY]: contentNode._id,
        [SEARCH_REPO_CONTENT_PATH_KEY]: contentNode._path,
        [SEARCH_REPO_HREF_KEY]: getHref(contentNode, locale),
        [SEARCH_REPO_LOCALE_KEY]: locale,
        _name: name,
        _parentPath: `/${SEARCH_REPO_CONTENT_BASE_NODE}`,
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

const searchNodeIsFresh = (searchNode: SearchNode, contentNode: Content, facets: ContentFacet[]) =>
    facetsAreEqual(facets, searchNode.facets) &&
    dateTimesAreEqual(contentNode.modifiedTime, searchNode.modifiedTime);

export const createOrUpdateSearchNode = ({
    contentNode,
    facets = [],
    existingSearchNodes = [],
    searchRepoConnection,
    locale,
}: {
    contentNode: RepoNode<Content>;
    facets: ContentFacet[];
    existingSearchNodes: SearchNode[];
    searchRepoConnection: RepoConnection;
    locale: string;
}) => {
    if (facets.length === 0) {
        existingSearchNodes.forEach((node) => {
            deleteSearchNode(node._id, searchRepoConnection);
        });
        return false;
    }

    const searchNodeParams = searchNodeTransformer(contentNode, facets, locale);

    const { contentPath, contentId } = searchNodeParams;

    if (existingSearchNodes.length === 1) {
        const searchNode = existingSearchNodes[0];

        if (searchNodeIsFresh(searchNode, contentNode, facets)) {
            return false;
        }

        searchRepoConnection.modify({
            key: searchNode._id,
            editor: () => searchNodeParams,
        });
        return true;
    } else if (existingSearchNodes.length > 1) {
        // If multiple search nodes exists for a content, something has gone wrong at some point
        // in the past. Remove everything and notify the problem has occured.
        logger.critical(
            `Multiple existing search nodes found for [${contentId}] ${contentPath} - ${existingSearchNodes
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
            logger.critical(`Failed to create search node for content from ${contentPath}`);
            return false;
        }

        logger.info(`Created search node for ${contentPath} with facets ${JSON.stringify(facets)}`);
        return true;
    } catch (e) {
        logger.critical(`Error while creating search node for content from ${contentPath} - ${e}`);
        return false;
    }
};
