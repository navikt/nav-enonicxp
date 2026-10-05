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
import contactOptionComponentsQuery from './component-queries/contactOptionComponents.graphql';
import { PortalComponent } from '../../../types/components/component-portal';
import { guillotineTransformSpecialComponents } from './transform-special-components';
import { logger } from '../../utils/logging';
import { getLocaleFromContext } from '../../localization/locale-context';
import { isContentPreviewOnly } from '../../utils/content-utils';
import { SitecontentResponse } from '../../../services/sitecontent/common/content-response';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { getOfficeEditorialType } from '../../office-pages/office-editorial';
import { forceArray } from '../../utils/array-utils';

export type GuillotineUnresolvedComponentType = { type: ComponentType; path: string };

type GuillotineComponentQueryResult = {
    components: GuillotineComponent[];
};

type ComponentsResolveArgs = {
    resolveTemplate: boolean;
    resolveFragment: boolean;
};

const CONTACT_OPTION_DESCRIPTOR = 'no.nav.navno:contact-option';

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

    // Certain pages need extra queries for resolving:
    // Some office pages have a separate editorial page. This is injected into the office page
    // through the office-callback and because only "page" is automatically recognized and resolved in content,
    // we need to run buildOfficeBranchPageWithEditorialContent that will specifically look for and resolve the editorial page.
    if (
        baseContent.type === 'no.nav.navno:office-page' &&
        getOfficeEditorialType(
            baseContent.data?.officeNorgData.data.type,
            baseContent.data?.useUnitEditorialPage
        )
    ) {
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

// The contact-option part is queried separately and only when needed, as including it in the
// main components query exceeds the maximum number of fields per query in the Guillotine app
const addContactOptionComponentsData = (
    components: GuillotineComponent[],
    queryParams: GuillotineQueryParams,
    resolveArgs: ComponentsResolveArgs
): GuillotineComponent[] => {
    const hasContactOptions = forceArray(components).some(
        (component) => component.part?.descriptor === CONTACT_OPTION_DESCRIPTOR
    );
    if (!hasContactOptions) {
        return components;
    }

    const result = runGuillotineQuery({
        branch: queryParams.branch,
        throwOnErrors: queryParams.throwOnErrors,
        query: contactOptionComponentsQuery,
        params: { ...queryParams.params, ...resolveArgs },
    })?.get as GuillotineComponentQueryResult;

    const contactOptionsByPath = forceArray(result?.components).reduce<Record<string, unknown>>(
        (acc, component) => {
            const contactOption = component.part?.config?.no_nav_navno?.contact_option;
            if (contactOption) {
                acc[component.path] = contactOption;
            }
            return acc;
        },
        {}
    );

    return components.map((component) => {
        const contactOption = contactOptionsByPath[component.path];
        if (!contactOption) {
            return component;
        }

        const config = component.part.config || {};

        return {
            ...component,
            part: {
                ...component.part,
                config: {
                    ...config,
                    no_nav_navno: { ...config.no_nav_navno, contact_option: contactOption },
                },
            },
        };
    });
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

        const fragmentQueryParams: GuillotineQueryParams = {
            ...queryParams,
            query: fragmentComponentsQuery,
            params: { ref: fragmentId },
        };

        const fragment = runGuillotineQuery(fragmentQueryParams)?.get;

        if (!fragment) {
            const msg = `Invalid fragment reference ${fragmentId} in content [${getLocaleFromContext()}] ${baseContent._id}`;
            if (queryParams.branch === 'draft' || isContentPreviewOnly(baseContent)) {
                logger.info(msg);
            } else {
                logger.critical(msg, false, true);
            }
        }

        acc.push({
            type: 'fragment',
            path: component.path,
            // If the fragment was not found, set the fragment component tree to an empty object
            // to ensure it is rendered (as an error) in the CS preview. This allows editors to remove
            // the invalid fragment
            fragment: fragment
                ? buildFragmentComponentTree(
                      addContactOptionComponentsData(fragment.components, fragmentQueryParams, {
                          resolveTemplate: true,
                          resolveFragment: true,
                      })
                  )
                : {},
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

    const components = addContactOptionComponentsData(result.components, queryParams, {
        resolveTemplate: true,
        resolveFragment: false,
    });

    return processComponentsQueryResult(baseContent, components, queryParams);
};

export const runGuillotineComponentPreviewQuery = (baseContent: Content, componentPath: string) => {
    const queryParams: GuillotineQueryParams = {
        branch: 'draft',
        query: componentPreviewQuery,
        jsonBaseKeys: ['config', 'data'],
        params: {
            ref: baseContent._id,
        },
    };

    const result = runGuillotineQuery(queryParams)?.get as GuillotineComponentQueryResult;
    if (!result) {
        return null;
    }

    const componentsForPath = forceArray(result.components).filter((component) =>
        component.path.startsWith(componentPath)
    );

    if (componentsForPath.length === 0) {
        logger.warning(
            `Invalid component path ${componentPath} on content ${baseContent._id} - no components found`
        );
        return null;
    }

    const components = addContactOptionComponentsData(componentsForPath, queryParams, {
        resolveTemplate: false,
        resolveFragment: false,
    });

    return processComponentsQueryResult(baseContent, components, queryParams);
};

const buildOfficeBranchPageWithEditorialContent = (contentQueryResult: any) => {
    const officeEditorialPageContent = contentQueryResult?.editorial;

    if (!officeEditorialPageContent) {
        return contentQueryResult;
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
