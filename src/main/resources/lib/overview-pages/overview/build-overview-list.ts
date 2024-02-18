import { Content } from '/lib/xp/content';
import { runInContext } from '../../context/run-in-context';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getOverviewContent } from './get-overview-content';
import { logger } from '../../utils/logging';
import { buildOverviewListLegacy } from './build-overview-list-legacy';
import { transformToOverviewItem } from './transform-to-overview-item';
import { ContentWithProductDetails } from './types';
import { forceArray } from '../../utils/array-utils';
import { getLocalizedContentWithFallbackData } from '../common/localization';

const sortByTitle = sortByLocaleCompareOnField('title');

const buildSimpleOverviewList = (productPageContents: ContentWithProductDetails[]) =>
    productPageContents.map(transformToOverviewItem);

const buildDetailedOverviewList = (
    productPageContents: ContentWithProductDetails[],
    localeFallbackIds: string[],
    language: string
) =>
    getLocalizedContentWithFallbackData({
        contents: productPageContents,
        localeFallbackIds,
        language,
    }).map(transformToOverviewItem);

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

    const productList = runInContext({ branch: 'master' }, () => {
        if (overviewType === 'all_products') {
            return buildSimpleOverviewList(listContents);
        }

        // TODO: remove this once all relevant overview pages have been converted to use the locale fallback system
        if (!localeFallback) {
            return buildOverviewListLegacy(listContents, overviewType, language);
        }

        return buildDetailedOverviewList(listContents, forceArray(localeFallback), language);
    });

    return productList.sort(sortByTitle);
};
