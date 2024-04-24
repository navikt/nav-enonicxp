import { Content } from '/lib/xp/content';
import { BaseQueryParams, RepoBranch } from '../../../types/common';
import { contentTypesWithComponents } from '../../contenttype-lists';
import { ComponentType } from '../../../types/components/component-config';
import {
    buildFragmentComponentTree,
    buildPageComponentTree,
    GuillotineComponent,
} from '../utils/process-components';
import { runGuillotineContentQuery } from './run-content-query';
import { GuillotineQueryParams, runGuillotineQuery } from '../utils/run-guillotine-query';
import componentsQuery from './component-queries/components.graphql';
import componentPreviewQuery from './component-queries/componentPreview.graphql';
import fragmentComponentsQuery from './component-queries/fragmentComponents.graphql';
import { PortalComponent } from '../../../types/components/component-portal';
import { guillotineTransformSpecialComponents } from './transform-special-components';
import { logger } from '../../utils/logging';
import { getLocaleFromContext } from '../../localization/locale-context';
import { isContentPreviewOnly } from '../../utils/content-utils';
import { SitecontentResponse } from '../../../services/sitecontent/common/content-response';
import { ContentDescriptor } from '../../../types/content-types/content-config';

export type GuillotineUnresolvedComponentType = { type: ComponentType; path: string };

type GuillotineComponentQueryResult = {
    components: GuillotineComponent[];
};

const contentTypesWithComponentsSet: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesWithComponents
);

export const runSitecontentGuillotineQuery = (
    baseContent: Content,
    branch: RepoBranch
): SitecontentResponse => {
    const baseQueryParams = {
        branch,
        params: { ref: baseContent._id },
        throwOnErrors: true,
    };

    const contentQueryResult = runGuillotineContentQuery(baseContent, baseQueryParams);
    if (!contentQueryResult) {
        return null;
    }

    // Skip the components query and processing for content types which are not intended for use
    // with components
    if (!contentTypesWithComponentsSet.has(baseContent.type)) {
        return contentQueryResult;
    }

    // Certain pages need extra queries for resolving.
    if (baseContent.type === 'no.nav.navno:office-page') {
        return buildOfficeBranchPageWithEditorialContent(contentQueryResult);
    }

    const { components, fragments } = runGuillotineComponentsQuery(baseQueryParams, baseContent);

    return {
        ...contentQueryResult,
        page: buildPageComponentTree({
            page: contentQueryResult.page,
            components,
            fragments,
        }),
    };
};

const processComponentsQueryResult = (
    baseContent: Content,
    components: GuillotineComponent[],
    queryParams: GuillotineQueryParams
) => {
    // Resolve fragments through separate queries to workaround a bug in the Guillotine resolver which prevents
    // nested fragments from resolving
    const fragments = components.reduce<PortalComponent<'fragment'>[]>((acc, component) => {
        const fragmentId = component.fragment?.id;

        if (component.type !== 'fragment' || !fragmentId) {
            return acc;
        }

        const fragment = runGuillotineQuery({
            ...queryParams,
            query: fragmentComponentsQuery,
            params: { ref: fragmentId },
        })?.get;

        if (!fragment) {
            const locale = getLocaleFromContext();
            const logLevel = isContentPreviewOnly(baseContent) ? 'warning' : 'critical';
            logger[logLevel](
                `Invalid fragment reference ${fragmentId} in content [${locale}] ${baseContent._id}`,
                true
            );
        }

        acc.push({
            type: 'fragment',
            path: component.path,
            // If the fragment was not found, set the fragment component tree to an empty object
            // to ensure it is rendered (as an error) in the CS preview. This allows editors to remove
            // the invalid fragment
            fragment: fragment ? buildFragmentComponentTree(fragment.components) : {},
        });

        return acc;
    }, []);

    const transformedComponents = guillotineTransformSpecialComponents({
        components,
        baseContent,
        branch: queryParams.branch,
        runSitecontentGuillotineQuery,
    });

    return { components: transformedComponents, fragments };
};

export const runGuillotineComponentsQuery = (
    baseQueryParams: Omit<GuillotineQueryParams, 'query'>,
    baseContent: Content
) => {
    const queryParams: GuillotineQueryParams = {
        ...baseQueryParams,
        query: componentsQuery,
        jsonBaseKeys: ['config', 'data'],
    };

    const result = runGuillotineQuery(queryParams)?.get as GuillotineComponentQueryResult;

    if (!result) {
        return { components: [], fragments: [] };
    }

    return processComponentsQueryResult(baseContent, result.components, queryParams);
};

export const runGuillotineComponentPreviewQuery = (baseContent: Content, componentPath: string) => {
    const queryParams: GuillotineQueryParams = {
        branch: 'draft',
        query: componentPreviewQuery,
        jsonBaseKeys: ['config', 'data'],
        params: {
            ref: baseContent._id,
            path: componentPath,
        },
    };

    const result = runGuillotineQuery(queryParams)?.get as GuillotineComponentQueryResult;
    if (!result) {
        return null;
    }

    return processComponentsQueryResult(baseContent, result.components, queryParams);
};

const buildOfficeBranchPageWithEditorialContent = (contentQueryResult: any) => {
    const officeEditorialPageContent = contentQueryResult?.editorial;

    // Editorial page is null if office is not of type LOKAL,
    // so skip further resolving and just return.
    if (!officeEditorialPageContent) {
        return {
            ...contentQueryResult,
            editorial: {
                page: {},
            },
        };
    }

    const officeEditorialQueryParams: BaseQueryParams = {
        branch: 'master',
        throwOnErrors: true,
        params: {
            ref: officeEditorialPageContent._id,
        },
    };

    // Run guillotine query in order to resolve fragments and global
    // values contained in the editorial page object.
    const { components, fragments } = runGuillotineComponentsQuery(
        officeEditorialQueryParams,
        officeEditorialPageContent
    );

    return {
        ...contentQueryResult,
        editorial: {
            ...contentQueryResult.editorial,
            page: buildPageComponentTree({
                page: contentQueryResult.editorial.page,
                components,
                fragments,
            }),
        },
    };
};
