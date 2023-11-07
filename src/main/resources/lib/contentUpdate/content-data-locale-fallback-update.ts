import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { forceArray, removeDuplicates } from '../utils/array-utils';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { ArrayOrSingle } from '../../types/util-types';
import { ContentDataLocaleFallback } from '../../site/content-types/content-data-locale-fallback/content-data-locale-fallback';
import { runInContext } from '../context/run-in-context';
import { logger } from '../utils/logging';
import { SUPER_USER_FULL } from '../constants';

type FallbackContent = Content<'no.nav.navno:content-data-locale-fallback'>;
type Item = NonNullable<ContentDataLocaleFallback['items']>[number];

const sortByTitle = (a: Item, b: Item) => {
    if (a.title === b.title) {
        return 0;
    }

    return a.title > b.title ? 1 : -1;
};

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

    if (!isListChanged && !content.data.forceRefresh) {
        return;
    }

    logger.info(`Regenerating locale fallback content ${content._id}`);

    contentLib.modify({
        key: content._id,
        requireValid: false,
        editor: (_content) => {
            _content.data.forceRefresh = false;
            _content.data.items = updatedItemsList;
            return _content;
        },
    });
};

export const contentDataLocaleFallbackRefreshItems = (content: FallbackContent) => {
    if (!content.valid) {
        return;
    }

    // Check the last modifier to ensure this function never runs in an infinite loop
    if (content.modifier === SUPER_USER_FULL) {
        logger.warning(`Possible update loop on update handler for locale fallback data: ${content._id}`);
        return;
    }

    runInContext({ asAdmin: true }, () => refreshItemsList(content));
};
