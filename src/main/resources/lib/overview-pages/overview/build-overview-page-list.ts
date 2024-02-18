import { runInContext } from '../../context/run-in-context';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getProductPagesForOverview } from './get-product-pages-for-overview';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { buildOverviewListLegacy } from './build-overview-list-legacy';
import { transformProductContentToOverviewItem } from './transform-product-content-to-overview-item';
import { ContentWithProductDetails } from './types';

const sortByTitle = sortByLocaleCompareOnField('title');

const buildSimpleProductsList = (productPageContents: ContentWithProductDetails[]) =>
    productPageContents.map(transformProductContentToOverviewItem);

export const buildOverviewPageList = (overviewContent: Content<'no.nav.navno:overview'>) => {
    const { data, language, _id } = overviewContent;
    const { overviewType, audience, localeFallback } = data;

    if (!overviewType) {
        logger.error(`Type not set for overview page id ${_id}`);
        return [];
    }

    if (!audience) {
        logger.error(`Audience not set for overview page id ${_id}`);
        return [];
    }

    const productPageContents = getProductPagesForOverview({ overviewType, audience });

    const productList = runInContext({ branch: 'master' }, () => {
        if (overviewType === 'all_products') {
            return buildSimpleProductsList(productPageContents);
        }

        if (!localeFallback) {
            return buildOverviewListLegacy(productPageContents, overviewType, language);
        }

        return [];
    });

    return productList.sort(sortByTitle);
};
