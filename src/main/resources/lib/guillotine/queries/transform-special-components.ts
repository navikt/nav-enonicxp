import { GuillotineComponent } from '../utils/process-components';
import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { logger } from '../../utils/logging';
import { ProductDetails } from '../../../site/content-types/product-details/product-details';
import { runSitecontentGuillotineQuery } from './run-sitecontent-query';
import { isContentWithProductDetails } from '../../product-utils/types';

type SitecontentQueryFunc = typeof runSitecontentGuillotineQuery;

// The product-details part requires an additional query to retrieve the components
// to render in the part.
const transformProductDetailsPart = (
    component: GuillotineComponent,
    baseContent: Content,
    branch: RepoBranch,
    runSitecontentGuillotineQuery: SitecontentQueryFunc
): GuillotineComponent => {
    const baseContentId = baseContent._id;

    if (!isContentWithProductDetails(baseContent)) {
        logger.error(
            `Base content is not a valid type for product details - Base content id ${baseContentId}`,
            true
        );
        return component;
    }

    const productDetailsPartConfig = component.part.config?.no_nav_navno?.product_details;
    if (!productDetailsPartConfig) {
        logger.error(
            `Product detail part is not configured - Base content id ${baseContentId}`,
            true
        );
        return component;
    }

    const detailType = productDetailsPartConfig.detailType;
    if (!detailType) {
        logger.error(`No product detail type specified - Base content id ${baseContentId}`, true);
        return component;
    }

    const detailContentId = baseContent.data?.[detailType as ProductDetails['detailType']];
    if (!detailContentId) {
        logger.error(`No product detail id specified - Base content id ${baseContentId}`, true);
        return component;
    }

    const detailBaseContent = contentLib.get({ key: detailContentId });
    if (!detailBaseContent) {
        logger.error(
            `No product detail content found for id ${detailContentId} - Base content id ${baseContentId}`,
            true
        );
        return component;
    }

    const detailContent = runSitecontentGuillotineQuery(detailBaseContent, branch);
    if (!detailContent) {
        logger.error(
            `Product detail content query failed for id ${detailContentId} - Base content id ${baseContentId}`,
            true
        );
        return component;
    }

    const detailComponents = detailContent.page?.regions?.main?.components;
    if (!detailComponents) {
        logger.error(
            `No product detail main region components found for id ${detailContentId} - Base content id ${baseContentId}`,
            true
        );
        return component;
    }

    return {
        ...component,
        part: {
            ...component.part,
            config: {
                ...component.part.config,
                no_nav_navno: {
                    product_details: {
                        ...productDetailsPartConfig,
                        language: detailContent.language,
                        components: detailComponents,
                    },
                },
            },
        },
    };
};

// We don't want to return disabled cards to the public/master frontend
const transformAreapageSituationCardPart = (
    component: GuillotineComponent | null,
    branch: RepoBranch
) => {
    if (
        branch === 'master' &&
        component?.part.config?.no_nav_navno?.areapage_situation_card?.disabled
    ) {
        return null;
    }

    return component;
};

// Certain components need some extra processing which is more convenient to handle
// after the main Graphql query
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
}): GuillotineComponent[] => {
    return components
        .map((component) => {
            switch (component.part?.descriptor) {
                case 'no.nav.navno:product-details':
                    return transformProductDetailsPart(
                        component,
                        baseContent,
                        branch,
                        runSitecontentGuillotineQuery
                    );
                case 'no.nav.navno:areapage-situation-card':
                    return transformAreapageSituationCardPart(component, branch);
                default:
                    return component;
            }
        })
        .filter((component): component is GuillotineComponent => component !== null);
};
