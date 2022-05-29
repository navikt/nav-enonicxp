import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { contentTypesWithComponents as _contentTypesWithComponents } from '../../contenttype-lists';
import { stringArrayToSet } from '../../utils/nav-utils';
import { ComponentType } from '../../../types/components/component-config';
import { buildPageComponentTree, GuillotineComponent } from '../utils/process-components';
import { runGuillotineContentQuery } from './run-content-query';
import { runGuillotineComponentsQuery } from './run-components-query';
import { logger } from '../../utils/logging';

export type GuillotineUnresolvedComponentType = { type: ComponentType; path: string };

const contentTypesWithComponents = stringArrayToSet(_contentTypesWithComponents);

// The product-details part requires an additional query to retrieve the components
// to render in the part.
// TODO: when server-components in react/next reach a more mature state, see if this
// can be refactored into a separate call/query from the frontend
const handleProductDetailsPart = (
    components: GuillotineComponent[],
    contentQueryResult: any,
    branch: RepoBranch
) => {
    const baseContentId = contentQueryResult._id;

    components.forEach((component) => {
        if (component.part?.descriptor === 'no.nav.navno:product-details') {
            const productDetailsPartConfig = component.part.config?.no_nav_navno?.product_details;
            if (!productDetailsPartConfig) {
                logger.error(
                    `Product detail part is not configured - Base content id ${baseContentId}`
                );
                return;
            }

            const detailType = productDetailsPartConfig.detailType;
            if (!detailType) {
                logger.error(`No product detail type specified - Base content id ${baseContentId}`);
                return;
            }

            const detailContentId = contentQueryResult.data?.[detailType];
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
            productDetailsPartConfig.contentId = detailContentId;
        }
    });
};

export const runSitecontentGuillotineQuery = (baseContent: Content, branch: RepoBranch) => {
    const baseQueryParams = {
        branch,
        params: { ref: baseContent._id },
        throwOnErrors: true,
    };

    const contentQueryResult = runGuillotineContentQuery(baseContent, baseQueryParams);

    // Skip the components query and processing for content types which are not intended for use
    // with components
    if (!contentTypesWithComponents[baseContent.type]) {
        return contentQueryResult;
    }

    const { components, fragments } = runGuillotineComponentsQuery(baseQueryParams);

    handleProductDetailsPart(components, contentQueryResult, branch);

    return {
        ...contentQueryResult,
        page: buildPageComponentTree({
            page: contentQueryResult.page,
            components,
            fragments,
        }),
    };
};
