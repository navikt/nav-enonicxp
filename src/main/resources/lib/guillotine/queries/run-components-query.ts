import componentsQuery from './component-queries/components.graphql';
import { GuillotineQueryParams, runGuillotineQuery } from '../utils/run-guillotine-query';
import fragmentComponentsQuery from './component-queries/fragmentComponents.graphql';
import { buildFragmentComponentTree, GuillotineComponent } from '../utils/process-components';
import { PortalComponent } from '../../../types/components/component-portal';
import { runGuillotineContentQuery } from './run-content-query';

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
            const id =
                component.part?.config['no-nav-navno']['product-details']?.productDetailsTarget;

            const deepQueryParams = {
                ...baseQueryParams,
                params: { ref: id },
                jsonBaseKeys: ['config', 'data'],
            };

            const baseContent =
                component.part?.config['no_nav_navno']['product_details']?.productDetailsTarget;

            const deepResult = runGuillotineComponentsQuery(deepQueryParams);
            const relevantComponents = deepResult.components.filter((component) =>
                component.path.includes('/main')
            );

            const mergedComponents = relevantComponents.map((component) => {
                if (component.type === 'fragment') {
                    const resolvedFragment = deepResult.fragments.find(
                        (fragment) => fragment.path === component.path
                    );
                    return resolvedFragment || component;
                }

                return component;
            });

            const page = runGuillotineContentQuery(baseContent, deepQueryParams);

            const productDetailsContent =
                component.part?.config?.no_nav_navno?.product_details?.productDetailsTarget;

            if (!productDetailsContent) {
                return component;
            }

            component.part.config.no_nav_navno.product_details.productDetailsTarget = {
                components: mergedComponents,
                page,
            };

            return component;
        }
        return component;
    });

    // Resolve fragments through separate queries to workaround a bug in the Guillotine resolver which prevents
    // nested fragments from resolving
    const fragments = deepComponents.reduce((acc, component) => {
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
                // If the fragment was not found, set the fragment component tree to an empty object
                // to ensure it is rendered (as an error) in the CS preview. This allows editors to remove
                // the invalid fragment
                fragment: fragment ? buildFragmentComponentTree(fragment.components) : {},
            } as PortalComponent<'fragment'>,
        ];
    }, [] as PortalComponent<'fragment'>[]);

    return { components: deepComponents, fragments };
};
