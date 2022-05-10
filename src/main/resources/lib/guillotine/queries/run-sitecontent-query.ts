import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { dynamicPageContentTypes } from '../../contenttype-lists';
import { stringArrayToSet } from '../../utils/nav-utils';
import { ComponentType } from '../../../types/components/component-config';
import { buildPageComponentTree, GuillotineComponent } from '../utils/process-components';
import { runGuillotineContentQuery } from './run-content-query';
import { runGuillotineComponentsQuery } from './run-components-query';

export type GuillotineUnresolvedComponentType = { type: ComponentType; path: string };

const dynamicPageContentTypesSet = stringArrayToSet(dynamicPageContentTypes);

export const runSitecontentGuillotineQuery = (baseContent: Content, branch: RepoBranch) => {
    const baseQueryParams = {
        branch,
        params: { ref: baseContent._id },
        throwOnErrors: true,
    };

    const contentQueryResult = runGuillotineContentQuery(baseContent, baseQueryParams);

    // Skip the components query and processing for content types which are not intended for use
    // with components
    if (!dynamicPageContentTypesSet[baseContent.type]) {
        return contentQueryResult;
    }

    const { components, fragments } = runGuillotineComponentsQuery(baseQueryParams);

    components.forEach((component) => {
        if (component.part?.descriptor === 'no.nav.navno:product-details') {
            const deepBaseContent =
                component.part?.config?.no_nav_navno?.product_details?.productDetailsTarget;

            if (!deepBaseContent) {
                return;
            }

            const page = runSitecontentGuillotineQuery(deepBaseContent, branch);

            if (page) {
                component.part.config['no_nav_navno']['product_details'].productDetailsTarget =
                    page;
            }
        }
    });

    return {
        ...contentQueryResult,
        page: buildPageComponentTree({
            page: contentQueryResult.page,
            components: components as GuillotineComponent[],
            fragments,
        }),
    };
};
