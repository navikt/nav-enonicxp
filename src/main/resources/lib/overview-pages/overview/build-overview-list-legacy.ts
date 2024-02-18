import { ContentTypesInOverviewPages, OverviewPageDetailedType, OverviewPageItem } from './types';
import { getPublicPath } from '../../paths/public-path';
import { Content } from '/lib/xp/content';
import { getProductDetailsFromContent } from './get-product-details-from-content';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { transformToOverviewItem } from './transform-to-overview-item';

export const buildOverviewListLegacy = (
    productPages: Content<ContentTypesInOverviewPages>[],
    overviewType: OverviewPageDetailedType,
    requestedLanguage: string
) => {
    // Keep track of which product details have been added, to ensure we do not get unwanted dupes
    const productDetailsAdded = new Set<string>();

    // The rule here is that we want every product detail in the requested language included in the
    // final list, at least once. Each detail can be included multiple times, but only if they are
    // used on multiple product pages in the requested language.
    const productDataMap = productPages.reduce<Record<string, OverviewPageItem>>(
        (acc, productPageContent) => {
            const productDetailsContent = getProductDetailsFromContent(
                productPageContent,
                overviewType
            );
            if (!productDetailsContent || productDetailsContent.language !== requestedLanguage) {
                return acc;
            }

            const { _id: productDetailsId } = productDetailsContent;
            const { _id: productPageId } = productPageContent;

            const isProductPageInRequestedLanguage =
                productPageContent.language === requestedLanguage;

            const productPageData = transformToOverviewItem(productPageContent);

            // We do not want the possibility of duplicate product details, unless they belong to
            // product pages in the requested language
            if (!isProductPageInRequestedLanguage && productDetailsAdded.has(productDetailsId)) {
                // Add another product link, to ensure all relevant products are linked from the product details
                // when the product pages themselves aren't localized
                if (acc[productDetailsId]) {
                    acc[productDetailsId].productLinks = [
                        ...acc[productDetailsId].productLinks,
                        ...productPageData.productLinks,
                    ].sort(sortByLocaleCompareOnField('title'));
                }
                return acc;
            }

            productDetailsAdded.add(productDetailsId);

            // If the product is not in the requested language, we use the name of the product details
            // as the displayed/sorted title
            const title = isProductPageInRequestedLanguage
                ? productPageData.title
                : productDetailsContent.displayName;

            const productData: OverviewPageItem = {
                ...productPageData,
                title,
                productDetailsPath: getPublicPath(productDetailsContent, requestedLanguage),
            };

            if (isProductPageInRequestedLanguage) {
                acc[productPageId] = productData;
                // Delete the data keyed with the product details own id, in case it was previously added
                delete acc[productDetailsId];
            } else {
                acc[productDetailsId] = productData;
            }

            return acc;
        },
        {}
    );

    return Object.values(productDataMap);
};
