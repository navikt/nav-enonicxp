import { GuillotineComponent } from '../utils/process-components';
import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { logger } from '../../utils/logging';
import { ProductDetails } from '../../../site/content-types/product-details/product-details';
import { runSitecontentGuillotineQuery } from './run-sitecontent-query';
import { isContentWithProductDetails } from '../../product-utils/types';

type SitecontentQueryFunc = typeof runSitecontentGuillotineQuery;

const handleProductDetailsPart = (
    component: GuillotineComponent,
    baseContent: Content,
    branch: RepoBranch,
    runSitecontentGuillotineQuery: SitecontentQueryFunc
) => {
    const baseContentId = baseContent._id;

    if (!isContentWithProductDetails(baseContent)) {
        logger.error(
            `Base content is not a valid type for product details - Base content id ${baseContentId}`
        );
        return;
    }

    const productDetailsPartConfig = component.part.config?.no_nav_navno?.product_details;
    if (!productDetailsPartConfig) {
        logger.error(`Product detail part is not configured - Base content id ${baseContentId}`);
        return;
    }

    const detailType = productDetailsPartConfig.detailType;
    if (!detailType) {
        logger.error(`No product detail type specified - Base content id ${baseContentId}`);
        return;
    }

    const detailContentId = baseContent.data?.[detailType as ProductDetails['detailType']];
    if (!detailContentId) {
        logger.error(`No product detail id specified - Base content id ${baseContentId}`);
        return;
    }

    const detailBaseContent = contentLib.get({ key: detailContentId });
    if (!detailBaseContent) {
        logger.error(
            `No product detail content found for id ${detailContentId} - Base content id ${baseContentId}`
        );
        return;
    }

    const detailContent = runSitecontentGuillotineQuery(detailBaseContent, branch);
    if (!detailContent) {
        logger.error(
            `Product detail content query failed for id ${detailContentId} - Base content id ${baseContentId}`
        );
        return;
    }

    const detailComponents = detailContent.page?.regions?.main?.components;
    if (!detailComponents) {
        logger.error(
            `No product detail main region components found for id ${detailContentId} - Base content id ${baseContentId}`
        );
        return;
    }

    productDetailsPartConfig.components = detailComponents;
};

// The product-details part requires an additional query to retrieve the components
// to render in the part.
// TODO: when server-components in react/next reach a more mature state, see if this
// can be refactored into a separate call/query from the frontend
export const guillotineTransformSpecialComponents = ({
    components,
    baseContent,
    branch,
    // pass this as an arg rather than import, as nashorn stack overflows on cyclic dependencies
    runSitecontentGuillotineQuery,
}: {
    components: GuillotineComponent[];
    baseContent: Content;
    branch: RepoBranch;
    runSitecontentGuillotineQuery: SitecontentQueryFunc;
}) => {
    components.forEach((component) => {
        if (component.part?.descriptor === 'no.nav.navno:product-details') {
            handleProductDetailsPart(component, baseContent, branch, runSitecontentGuillotineQuery);
        }
    });
};
