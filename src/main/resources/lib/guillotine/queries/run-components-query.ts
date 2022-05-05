import componentsQuery from './component-queries/components.graphql';
import { GuillotineQueryParams, runGuillotineQuery } from '../utils/run-guillotine-query';
import fragmentComponentsQuery from './component-queries/fragmentComponents.graphql';
import { buildFragmentComponentTree, GuillotineComponent } from '../utils/process-components';
import { PortalComponent } from '../../../types/components/component-portal';

export type GuillotineComponentQueryResult = {
    components: GuillotineComponent[];
};

export const runGuillotineComponentsQuery = (
    baseQueryParams: Omit<GuillotineQueryParams, 'query'>
) => {
    const queryParams = {
        ...baseQueryParams,
        query: componentsQuery,
        jsonBaseKeys: ['config', 'data'],
    };

    const result = runGuillotineQuery(queryParams)?.get as GuillotineComponentQueryResult;

    if (!result) {
        return { components: [], fragments: [] };
    }

    const { components } = result;

    const deepComponents: GuillotineComponent[] = components.map((component) => {
        if (component.part?.descriptor === 'no.nav.navno:product-details') {
            const productDetailsContent =
                component.part?.config?.no_nav_navno?.product_details?.productDetailsTarget;

            if (!productDetailsContent) {
                return component;
            }

            component.part.config.no_nav_navno.product_details.productDetailsTarget = {
                page: productDetailsContent.pageAsJson,
                data: productDetailsContent.data,
            };

            return component;
        }
        return component;
    });

    // Resolve fragments through separate queries to workaround a bug in the Guillotine resolver which prevents
    // nested fragments from resolving
    const fragments = components.reduce((acc, component) => {
        if (component.type !== 'fragment' || !component.fragment?.id) {
            return acc;
        }

        const fragment = runGuillotineQuery({
            ...queryParams,
            query: fragmentComponentsQuery,
            params: { ref: component.fragment.id },
        })?.get;

        return [
            ...acc,
            {
                type: 'fragment',
                path: component.path,
                fragment: buildFragmentComponentTree(fragment.components),
            } as PortalComponent<'fragment'>,
        ];
    }, [] as PortalComponent<'fragment'>[]);

    return { components: deepComponents, fragments };
};
