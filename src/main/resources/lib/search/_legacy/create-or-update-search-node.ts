import { RepoConnection, RepoNode } from '/lib/xp/node';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { ContentFacet, SearchNode, SearchNodeCreateParams } from '../../../types/search';
import { logger } from '../../utils/logging';
import {
    deleteSearchNode,
    facetsAreEqual,
    querySearchNodesForContent,
    SEARCH_REPO_CONTENT_BASE_NODE,
} from './search-utils';
import { generateUUID } from '../../utils/uuid';
import { getPublicPath } from '../../paths/public-path';
import { URLS } from '../../constants';
import { dateTimesAreEqual, fixDateFormat } from '../../utils/datetime-utils';
import { forceArray } from '../../utils/array-utils';
import { hasExternalProductUrl } from '../../paths/path-utils';
import { getSearchRepoConnection } from '../utils';

const SEARCH_REPO_CONTENT_PARENT_PATH = `/${SEARCH_REPO_CONTENT_BASE_NODE}`;

export const getSearchNodeHref = (content: Content, locale: string) => {
    switch (content.type) {
        case 'navno.nav.no.search:search-api2':
        case 'no.nav.navno:external-link': {
            return content.data.url;
        }
        case 'no.nav.navno:form-details': {
            const application = forceArray(content.data?.formType).find(
                (formType) => formType._selected === 'application'
            );
            if (!application || application._selected !== 'application') {
                return null;
            }

            const variation = forceArray(application.application?.variations)[0];
            if (!variation) {
                return null;
            }

            const selectedLink = variation.link?._selected;
            if (!selectedLink) {
                return null;
            }

            if (selectedLink === 'external') {
                return variation.link.external?.url;
            }

            const targetContentId = variation.link.internal?.target;
            if (!targetContentId) {
                return null;
            }

            const targetContent = contentLib.get({ key: targetContentId });
            if (!targetContent) {
                return null;
            }

            return `${URLS.FRONTEND_ORIGIN}${getPublicPath(targetContent, locale)}`;
        }
        default: {
            return hasExternalProductUrl(content)
                ? content.data.externalProductUrl
                : `${URLS.FRONTEND_ORIGIN}${getPublicPath(content, locale)}`;
        }
    }
};

// Note: datetimes must be provided as Date-objects with a format accepted by Nashorn
// in order for the datetime to be indexed as the correct type
const transformContentToSearchNodeParams = (
    contentNode: RepoNode<Content>,
    facets: ContentFacet[],
    locale: string
): SearchNodeCreateParams | null => {
    const href = getSearchNodeHref(contentNode, locale);

    if (!href) {
        return null;
    }

    const { createdTime, modifiedTime, publish, ...rest } = contentNode;

    // Add a uuid to prevent name collisions
    const name = `${contentNode._path.replace(/\//g, '_')}-${locale}-${generateUUID()}`;

    return {
        ...rest,
        facets: facets,
        contentId: contentNode._id,
        contentPath: contentNode._path,
        href,
        layerLocale: locale,
        _name: name,
        _parentPath: SEARCH_REPO_CONTENT_PARENT_PATH,
        ...(createdTime && {
            createdTime: new Date(fixDateFormat(createdTime)),
        }),
        ...(modifiedTime && {
            modifiedTime: new Date(fixDateFormat(modifiedTime)),
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
    dateTimesAreEqual(
        contentNode.modifiedTime || contentNode.createdTime,
        searchNode.modifiedTime || searchNode.createdTime
    ) &&
    searchNode.contentId === contentNode._id &&
    searchNode.contentPath === contentNode._path &&
    searchNode.layerLocale === locale &&
    searchNode.href === getSearchNodeHref(contentNode, locale);

const getExistingSearchNodes = (
    contentId: string,
    locale: string,
    searchRepoConnection: RepoConnection
) => {
    const existingSearchNodeIds = querySearchNodesForContent(
        contentId,
        locale,
        searchRepoConnection
    ).hits.map((hit) => hit.id);

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
}: {
    contentNode: RepoNode<Content>;
    facets: ContentFacet[];
    locale: string;
}): UpdateResult => {
    const searchRepoConnection = getSearchRepoConnection();

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
    if (!searchNodeParams) {
        logger.error(`Could not create search node for ${contentNode._id} ${locale}`);
        existingSearchNodes.forEach((node) => {
            deleteSearchNode(node._id, searchRepoConnection);
        });
        return { didUpdate: existingSearchNodes.length > 0 };
    }

    const { contentPath, contentId } = searchNodeParams;

    const contentLogString = `[${contentId}][${locale}] ${contentPath}`;

    if (existingSearchNodes.length === 1) {
        const searchNode = existingSearchNodes[0];

        if (searchNodeIsFresh(searchNode, contentNode, facets, locale)) {
            return { didUpdate: false, searchNodeId: searchNode._id };
        }

        searchRepoConnection.modify({
            key: searchNode._id,
            editor: () => searchNodeParams as any,
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
