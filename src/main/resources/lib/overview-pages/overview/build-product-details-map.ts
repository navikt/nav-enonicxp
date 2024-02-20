import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { ContentInOverviewPages, OverviewPageDetailedType } from './types';

type ProductDetailsMap = Record<string, Content<'no.nav.navno:product-details'>>;

export const buildProductDetailsMap = (
    productPageContents: ContentInOverviewPages[],
    overviewType: OverviewPageDetailedType
) => {
    const productDetailsIdsSet: Record<string, true> = {};

    productPageContents.forEach((content) => {
        const id = content.data[overviewType];
        if (!id) {
            return;
        }

        productDetailsIdsSet[id] = true;
    }, []);

    const productDetailsIds = Object.keys(productDetailsIdsSet);

    return contentLib
        .query({
            count: productDetailsIds.length,
            contentTypes: ['no.nav.navno:product-details'],
            filters: {
                ids: {
                    values: productDetailsIds,
                },
            },
        })
        .hits.reduce<ProductDetailsMap>((acc, formDetail) => {
            acc[formDetail._id] = formDetail;
            return acc;
        }, {});
};
