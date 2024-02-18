import { sanitize } from '/lib/xp/common';
import { ContentWithProductDetails, OverviewPageProductItem } from './types';
import { getPublicPath } from '../../paths/public-path';

export const transformProductContentToOverviewItem = (
    product: ContentWithProductDetails
): OverviewPageProductItem => {
    const { type, data, language, displayName } = product;
    const { title, audience, sortTitle } = data;

    const pageTitle = title || displayName;
    const listItemTitle = sortTitle || pageTitle;

    const path = getPublicPath(product, language);

    return {
        ...data,
        title: listItemTitle,
        audience: audience._selected,
        anchorId: sanitize(listItemTitle),
        productLinks: [
            {
                url: path,
                language,
                type,
                title: pageTitle,
            },
        ],
    };
};
