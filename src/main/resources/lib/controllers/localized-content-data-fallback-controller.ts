import * as portalLib from '/lib/xp/portal';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { ArrayOrSingle } from '../../types/util-types';
import { LocalizedContentDataFallback } from '../../site/content-types/localized-content-data-fallback/localized-content-data-fallback';

type FallbackContent = Content<'no.nav.navno:localized-content-data-fallback'>;
type Item = NonNullable<LocalizedContentDataFallback['items']>[number];

const getNewContent = (content: FallbackContent) => {
    const { contentTypes, items, contentQuery } = content.data;

    const existingContentIds = forceArray(items).map((item) => item?.contentId);

    return contentLib.query({
        count: 2000,
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

const refreshContentList = (content: FallbackContent) => {
    const newItems = getNewContent(content).map(transformToListItem).sort(sortByTitle);
    if (newItems.length === 0) {
        return;
    }

    const oldItems = forceArray(content.data.items).sort(sortByTitle);

    contentLib.modify({
        key: content._id,
        requireValid: false,
        editor: (_content) => {
            _content.data.items = [...newItems, ...oldItems];
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

    refreshContentList(content);
};

const formIntermediateStepController = (req: XP.Request) => {
    if (req.mode === 'edit' && req.method === 'GET') {
        validateAndHandleReq(req);
    }

    return frontendProxy(req);
};

export const get = formIntermediateStepController;
