import * as portalLib from '/lib/xp/portal';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { forceArray, removeDuplicates } from '../utils/array-utils';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { ArrayOrSingle } from '../../types/util-types';
import { LocalizedContentDataFallback } from '../../site/content-types/localized-content-data-fallback/localized-content-data-fallback';

type FallbackContent = Content<'no.nav.navno:localized-content-data-fallback'>;
type Item = NonNullable<LocalizedContentDataFallback['items']>[number];

const findNewContent = (content: FallbackContent, existingItems: Item[]) => {
    const { contentTypes, contentQuery } = content.data;

    const existingContentIds = existingItems.map((item) => item.contentId);

    return contentLib.query({
        count: 500,
        contentTypes: forceArray(contentTypes as ArrayOrSingle<ContentDescriptor>),
        query: contentQuery,
        filters: {
            boolean: {
                mustNot: [
                    {
                        ids: {
                            values: existingContentIds,
                        },
                    },
                ],
            },
        },
    }).hits;
};

const transformToListItem = (content: Content): Item => {
    const { _id, displayName, data } = content;

    return {
        title: data.title || displayName,
        sortTitle: data.sortTitle || '',
        ingress: data.ingress || displayName,
        contentId: _id,
        enabled: false,
    };
};

const sortByTitle = (a: Item, b: Item) => (a.title > b.title ? 1 : -1);

const splitByEnabledStatus = (items: Item[]) =>
    items.reduce<{
        enabledItems: Item[];
        disabledItems: Item[];
    }>(
        (acc, item) => {
            if (item?.enabled) {
                acc.enabledItems.push(item);
            } else {
                acc.disabledItems.push(item);
            }

            return acc;
        },
        { enabledItems: [], disabledItems: [] }
    );

const itemsAreEqual = (itemA: Item, itemB: Item) => {
    return Object.entries(itemA).every(([key, value]) => itemB[key as keyof Item] === value);
};

const refreshItemsList = (content: FallbackContent) => {
    const existingItems = forceArray(content.data.items).sort(sortByTitle);

    const { enabledItems, disabledItems } = splitByEnabledStatus(existingItems);

    const disabledItemsMap = new Map(disabledItems.map((item) => [item.contentId, item]));

    const newItems = findNewContent(content, enabledItems)
        .map(transformToListItem)
        .filter((item) => {
            const existingItem = disabledItemsMap.get(item.contentId);
            return !existingItem || itemsAreEqual(item, existingItem);
        })
        .sort(sortByTitle);

    if (newItems.length === 0) {
        return;
    }

    contentLib.modify({
        key: content._id,
        requireValid: false,
        editor: (_content) => {
            _content.data.items = removeDuplicates(
                [...newItems, ...disabledItems, ...enabledItems],
                (a, b) => a.contentId === b.contentId
            );
            return _content;
        },
    });
};

const validateAndHandleReq = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (!content) {
        logger.error(`Content not found for path ${req.rawPath}`);
        return;
    }

    if (content.type !== 'no.nav.navno:localized-content-data-fallback') {
        logger.error(
            `Invalid content type for localized-content-data-fallback controller: ${content.type}`
        );
        return;
    }

    if (!content.valid) {
        return;
    }

    refreshItemsList(content);
};

const formIntermediateStepController = (req: XP.Request) => {
    if (req.mode === 'edit' && req.method === 'GET') {
        validateAndHandleReq(req);
    }

    return frontendProxy(req);
};

export const get = formIntermediateStepController;
