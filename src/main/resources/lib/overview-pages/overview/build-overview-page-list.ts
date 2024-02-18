import { Content } from '/lib/xp/content';
import { runInContext } from '../../context/run-in-context';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getProductPagesForOverview } from './get-product-pages-for-overview';
import { logger } from '../../utils/logging';
import { buildDetailedOverviewListLegacy } from './build-detailed-overview-list-legacy';
import { transformProductContentToOverviewItem } from './transform-product-content-to-overview-item';
import { ContentWithProductDetails } from './types';
import { forceArray } from '../../utils/array-utils';

const sortByTitle = sortByLocaleCompareOnField('title');

const buildSimpleOverviewList = (productPageContents: ContentWithProductDetails[]) =>
    productPageContents.map(transformProductContentToOverviewItem);

export const buildOverviewPageList = (overviewContent: Content<'no.nav.navno:overview'>) => {
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

    const productPageContents = getProductPagesForOverview({
        overviewType,
        audience,
        excludedContentIds: forceArray(excludedContent),
    });

    const productList = runInContext({ branch: 'master' }, () => {
        if (overviewType === 'all_products') {
            return buildSimpleOverviewList(productPageContents);
        }

        if (!localeFallback) {
            return buildDetailedOverviewListLegacy(productPageContents, overviewType, language);
        }

        return [];
    });

    return productList.sort(sortByTitle);
};
