import { Content } from '/lib/xp/content';
import { runInContext } from '../../context/run-in-context';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getOverviewContent } from './get-overview-content';
import { logger } from '../../utils/logging';
import { buildOverviewListLegacy } from './build-overview-list-legacy';
import { transformToOverviewItem } from './transform-to-overview-item';
import { ContentInOverviewPages, OverviewPageDetailedType, OverviewPageItem } from './types';
import { forceArray } from '../../utils/array-utils';
import { getLocalizedContentWithFallbackData } from '../common/localization';
import { buildProductDetailsMap } from './build-product-details-map';

const buildSimpleOverviewList = (productPageContents: ContentInOverviewPages[]) =>
    productPageContents.map((content) => transformToOverviewItem(content));

const buildDetailedOverviewList = (
    productPageContents: ContentInOverviewPages[],
    overviewType: OverviewPageDetailedType
) => {
    const productDetailsMap = buildProductDetailsMap(productPageContents, overviewType);

    return productPageContents.reduce<OverviewPageItem[]>((acc, content) => {
        const id = content.data[overviewType] as string;
        const productDetails = productDetailsMap[id];

        if (productDetails) {
            acc.push(transformToOverviewItem(content, productDetails));
        }

        return acc;
    }, []);
};

export const buildOverviewList = (overviewContent: Content<'no.nav.navno:overview'>) => {
    const { data, language, _id } = overviewContent;
    const { overviewType, audience, localeFallback, excludedContent } = data;

    if (!overviewType) {
        logger.error(`Type not set for overview page id ${_id}`);
        return [];
    }

    if (!audience) {
        logger.error(`Audience not set for overview page id ${_id}`);
        return [];
    }

    const listContents = getOverviewContent({
        overviewType,
        audience,
        excludedContentIds: forceArray(excludedContent),
    });

    const overviewList = runInContext({ branch: 'master' }, () => {
        // TODO: remove this once all relevant overview pages have been converted to the locale fallback system
        if (!localeFallback && overviewType !== 'all_products') {
            return buildOverviewListLegacy(listContents, overviewType, language);
        }

        const localizedContent = getLocalizedContentWithFallbackData({
            contents: listContents,
            localeFallbackIds: forceArray(localeFallback),
            language,
        });

        return overviewType === 'all_products'
            ? buildSimpleOverviewList(localizedContent)
            : buildDetailedOverviewList(localizedContent, overviewType);
    });

    return overviewList.sort(sortByLocaleCompareOnField('title'));
};
