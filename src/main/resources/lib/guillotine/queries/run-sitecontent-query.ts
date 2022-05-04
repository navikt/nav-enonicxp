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

    return {
        ...contentQueryResult,
        page: buildPageComponentTree({
            page: contentQueryResult.page,
            components: components as GuillotineComponent[],
            fragments,
        }),
    };
};
