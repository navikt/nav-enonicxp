import { Content } from '/lib/xp/content';
import { runInBranchContext } from '../../utils/branch-context';
import { RepoBranch } from '../../../types/common';
import { CustomContentDescriptor } from '../../../types/content-types/content-config';
import { guillotineQuery, GuillotineQueryParams } from '../guillotine-query';
import { getPathMapForReferences } from '../../custom-paths/custom-paths';
import { getBreadcrumbs } from '../utils/breadcrumbs';
import { dynamicPageContentTypes } from '../../contenttype-lists';
import { isMedia, stringArrayToSet } from '../../utils/nav-utils';
import { NodeComponent } from '../../../types/components/component-node';
import { PortalComponent } from '../../../types/components/component-portal';
import { ComponentType } from '../../../types/components/component-config';
import {
    buildFragmentComponentTree,
    buildPageComponentTree,
    GuillotineComponent,
} from '../utils/process-components';
import { graphQlContentQueries } from './contenttype-query-map';

import componentsQuery from './component-queries/components.graphql';
import fragmentComponentsQuery from './component-queries/fragmentComponents.graphql';

type BaseQueryParams = Pick<GuillotineQueryParams, 'branch' | 'params' | 'throwOnErrors'>;

export type GuillotineUnresolvedComponentType = { type: ComponentType; path: string };

const dynamicPageContentTypesSet = stringArrayToSet(dynamicPageContentTypes);

// TODO: improve these types if/when Guillotine gets better Typescript support
export type GuillotineContentQueryResult =
    | {
          type: CustomContentDescriptor;
          page: PortalComponent<'page'>;
      }
    | {
          type: 'portal:fragment';
          components: NodeComponent[];
          unresolvedComponentTypes: GuillotineUnresolvedComponentType[];
      };

export type GuillotineComponentQueryResult = {
    components: GuillotineComponent[];
};

export const guillotineComponentsQuery = (baseQueryParams: BaseQueryParams) => {
    const queryParams = {
        ...baseQueryParams,
        query: componentsQuery,
        jsonBaseKeys: ['config', 'data'],
    };

    const result = guillotineQuery(queryParams)?.get as GuillotineComponentQueryResult;

    if (!result) {
        return { components: [], fragments: [] };
    }

    const { components } = result;

    // Resolve fragments through separate queries to workaround a bug in the Guillotine resolver which prevents
    // nested fragments from resolving
    const fragments = components.reduce((acc, component) => {
        if (component.type !== 'fragment' || !component.fragment?.id) {
            return acc;
        }

        const fragment = guillotineQuery({
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

    return { components, fragments };
};

export const guillotineContentQuery = (baseContent: Content, branch: RepoBranch) => {
    const { _id, type } = baseContent;

    const baseQueryParams: BaseQueryParams = {
        branch,
        params: { ref: _id },
        throwOnErrors: true,
    };

    const contentQuery = graphQlContentQueries[type];

    if (!contentQuery) {
        return null;
    }

    // Media types only redirect to the media asset in the frontend and don't require any further processing
    if (isMedia(baseContent)) {
        return guillotineQuery({
            ...baseQueryParams,
            query: contentQuery,
        })?.get;
    }

    const contentQueryResult = guillotineQuery({
        ...baseQueryParams,
        query: contentQuery,
        jsonBaseKeys: ['data', 'config', 'page'],
    })?.get as GuillotineContentQueryResult;

    if (!contentQueryResult) {
        return null;
    }

    // This is the preview/editor page for fragments (not user-facing). This content type has a slightly
    // different components structure which requires some special handling
    if (contentQueryResult.type === 'portal:fragment') {
        return {
            ...contentQueryResult,
            fragment: buildFragmentComponentTree(
                contentQueryResult.components as GuillotineComponent[],
                contentQueryResult.unresolvedComponentTypes
            ),
            components: undefined,
        };
    }

    const breadcrumbs = runInBranchContext(() => getBreadcrumbs(_id), branch);

    const contentWithoutComponents = {
        ...contentQueryResult,
        pathMap: getPathMapForReferences(_id),
        ...(breadcrumbs && { breadcrumbs }),
    };

    // Skip the components query and processing for content types which are not intended for use
    // with components
    if (!dynamicPageContentTypesSet[type]) {
        return contentWithoutComponents;
    }

    const { components, fragments } = guillotineComponentsQuery(baseQueryParams);

    return {
        ...contentWithoutComponents,
        page: buildPageComponentTree({
            page: contentQueryResult.page,
            components: components as GuillotineComponent[],
            fragments,
        }),
    };
};
