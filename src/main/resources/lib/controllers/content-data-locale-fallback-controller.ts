import * as portalLib from '/lib/xp/portal';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { forceArray, removeDuplicates } from '../utils/array-utils';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { ArrayOrSingle } from '../../types/util-types';
import { ContentDataLocaleFallback } from '../../site/content-types/content-data-locale-fallback/content-data-locale-fallback';

type FallbackContent = Content<'no.nav.navno:content-data-locale-fallback'>;
type Item = NonNullable<ContentDataLocaleFallback['items']>[number];

const sortByTitle = (a: Item, b: Item) => (a.title > b.title ? 1 : -1);

const transformToListItem = (content: Content): Item => {
    const { _id, displayName, data } = content;

    return {
        title: data.title || displayName,
        sortTitle: data.sortTitle,
        ingress: data.ingress || displayName,
        contentId: _id,
        enabled: false,
    };
};

const splitByEnabledStatus = (items: ReadonlyArray<Item>) => {
    return items.reduce<{
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
};

const findNewItems = (content: FallbackContent, existingItems: Item[]) => {
    const { contentTypes, contentQuery } = content.data;

    const existingContentIds = existingItems.map((item) => item.contentId);

    return contentLib
        .query({
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
        })
        .hits.map(transformToListItem);
};

// We always keep existing items if they are enabled. Disabled items are removed if they no longer
// match the restrictions set on the fallback content.
const refreshItemsList = (content: FallbackContent) => {
    const currentItemsList: ReadonlyArray<Item> = forceArray(content.data.items);

    const { enabledItems, disabledItems } = splitByEnabledStatus(currentItemsList);

    const currentDisabledItemsMap = new Map(disabledItems.map((item) => [item.contentId, item]));

    const updatedDisabledItems = findNewItems(content, enabledItems).map((newItem) => {
        return currentDisabledItemsMap.get(newItem.contentId) || newItem;
    });

    const updatedItemsList: ReadonlyArray<Item> = removeDuplicates(
        [...updatedDisabledItems.sort(sortByTitle), ...enabledItems.sort(sortByTitle)],
        (a, b) => a.contentId === b.contentId
    );

    const isListChanged =
        currentItemsList.length !== updatedItemsList.length ||
        currentItemsList.some(
            (currentItem, currentIndex) =>
                currentItem.contentId !== updatedItemsList[currentIndex].contentId
        );

    if (!isListChanged) {
        return;
    }

    contentLib.modify({
        key: content._id,
        requireValid: false,
        editor: (_content) => {
            _content.data.items = updatedItemsList;
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

    if (content.type !== 'no.nav.navno:content-data-locale-fallback') {
        logger.error(
            `Invalid content type for content-data-locale-fallback controller: ${content.type}`
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
