import { Content } from '/lib/xp/content';
import { runInContext } from '../../context/run-in-context';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getOversiktContent as getContentThatHasDetails } from './helpers';
import { logger } from '../../utils/logging';
import { transformProductDetail } from './transform-to-oversikt-item';
import { ContentInOverviewPages, OversiktPageDetailedType, OversiktListItem } from './types';
import { forceArray } from '../../utils/array-utils';
import { getLocalizedContentWithFallbackData } from '../common/localization';
import { buildProductDetailsMap } from './build-product-details-map';
import { getLayersData } from '../../localization/layers-data';

const buildDetailedOverviewList = (
    productPageContents: ContentInOverviewPages[],
    oversiktType: OversiktPageDetailedType
) => {
    const productDetailsMap = buildProductDetailsMap(productPageContents, oversiktType);

    return productPageContents.reduce<OversiktListItem[]>((acc, content) => {
        const id = (content.data as Record<string, unknown>)[oversiktType] as string;
        const productDetail = productDetailsMap[id];

        if (productDetail) {
            acc.push(transformProductDetail(content, productDetail));
        }

        return acc;
    }, []);
};

export const buildProductDetailsList = (overviewContent: Content<'no.nav.navno:oversikt'>) => {
    const { data, language, _id } = overviewContent;
    const { oversiktType, audience, localeFallback, excludedContent } = data;

    if (!oversiktType || oversiktType === 'all_products') {
        logger.error(`Type invalid or not set set for overview page id ${_id}`);
        return [];
    }

    if (!audience) {
        logger.error(`Audience not set for overview page id ${_id}`);
        return [];
    }

    const contentWithProductDetails = getContentThatHasDetails({
        oversiktType,
        audience,
        excludedContentIds: forceArray(excludedContent),
    });

    const locale = language || getLayersData().defaultLocale;

    const productDetails = runInContext({ branch: 'master' }, () => {
        const localizedContent = getLocalizedContentWithFallbackData({
            contents: contentWithProductDetails,
            localeFallbackIds: forceArray(localeFallback),
            language: locale,
        });

        return buildDetailedOverviewList(localizedContent, oversiktType);
    });

    return productDetails.sort(sortByLocaleCompareOnField('title'));
};
