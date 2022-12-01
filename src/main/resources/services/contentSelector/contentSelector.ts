import contentLib, { Content } from '/lib/xp/content';
import portalLib from '/lib/xp/portal';
import {
    forceArray,
    generateFulltextQuery,
    getNestedValue,
    removeDuplicates,
    stripPathPrefix,
} from '../../lib/utils/nav-utils';
import { contentStudioEditPathPrefix } from '../../lib/constants';
import { customSelectorHitWithLink } from '../service-utils';
import { logger } from '../../lib/utils/logging';
import { ContentDescriptor } from '../../types/content-types/content-config';

type SelectorHit = XP.CustomSelectorServiceResponseHit;

type ReqParams = {
    contentTypes?: ContentDescriptor | ContentDescriptor[];
    selectorQuery?: string;
} & XP.CustomSelectorServiceRequestParams;

export const buildSelectorQuery = (selectorInput: string) => {
    const content = portalLib.getContent();
    if (!content) {
        logger.error(
            `Could not retrieve content from context, failed to build query for selector input ${selectorInput}`
        );
        return null;
    }

    return selectorInput.replace(/{(\w|\.|-)+}/g, (match) => {
        const fieldKey = match.replace(/[{}]/g, '');
        return getNestedValue(content, fieldKey);
    });
};

const buildQuery = (userInput?: string, selectorInput?: string) => {
    const userQuery = userInput ? generateFulltextQuery(userInput, ['displayName'], 'AND') : null;
    const selectorQuery = selectorInput ? buildSelectorQuery(selectorInput) : null;

    return [userQuery, selectorQuery].filter(Boolean).join(' AND ');
};

const transformHit = (content: Content): SelectorHit =>
    customSelectorHitWithLink(
        {
            id: content._id,
            displayName: `${content.language !== 'no' ? `[${content.language}]` : ''} ${
                content.displayName
            }`,
            description: stripPathPrefix(content._path),
        },
        `${contentStudioEditPathPrefix}/${content._id}`
    );

const getHitsFromQuery = (query: string, contentTypes?: ContentDescriptor[]): SelectorHit[] => {
    return contentLib
        .query({
            count: 1000,
            contentTypes: contentTypes,
            query: query || undefined,
        })
        .hits.map(transformHit);
};

const getHitsFromIds = (ids: string[]) =>
    ids.reduce((acc, id) => {
        const content = contentLib.get({ key: id });
        if (!content) {
            return acc;
        }

        return [...acc, transformHit(content)];
    }, [] as SelectorHit[]);

export const get = (req: XP.Request) => {
    const { query: userQuery, ids, contentTypes, selectorQuery } = req.params as ReqParams;

    const query = buildQuery(userQuery, selectorQuery);

    logger.info(`Query: ${query}`);

    const hits = removeDuplicates(
        [
            ...getHitsFromIds(forceArray(ids)),
            ...getHitsFromQuery(query, contentTypes ? forceArray(contentTypes) : undefined),
        ],
        (a, b) => a.id === b.id
    );

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            hits: hits,
            count: hits.length,
            total: hits.length,
        },
    };
};
