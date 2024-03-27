import { Content } from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { ContentInOverviewPages, OverviewPageItem } from './types';
import { getPublicPath } from '../../paths/public-path';
import { getLayersData } from '../../localization/layers-data';

export const transformToOverviewItem = (
    productPage: ContentInOverviewPages,
    productDetail?: Content<'no.nav.navno:product-details'>
): OverviewPageItem => {
    const { type, data, language, displayName } = productPage;
    const { title, audience, sortTitle, externalProductUrl } = data;

    const pageTitle = title || displayName;
    const listItemTitle = sortTitle || pageTitle;

    const locale = language || getLayersData().defaultLocale;

    return {
        ...data,
        title: listItemTitle,
        audience: audience._selected,
        anchorId: sanitize(listItemTitle),
        productDetailsPath: productDetail ? getPublicPath(productDetail, locale) : undefined,
        productLinks: [
            {
                language: locale,
                type,
                url: externalProductUrl || getPublicPath(productPage, locale),
                title: pageTitle,
            },
        ],
    };
};
