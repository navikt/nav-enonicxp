import { Request } from '@enonic-types/core'
import * as portalLib from '/lib/xp/portal';
import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { NodeComponent } from '../../types/components/component-node';
import { PartConfigs, PartComponentName } from '../../types/components/component-config';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../repos/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { FiltersMenu } from '@xp-types/site/parts/filters-menu';
import { forceArray } from '../utils/array-utils';
import { frontendProxy } from './frontend-proxy';

type DynamicContentRepoNode = RepoNode<Content>;
type FilterMenuComponent = NodeComponent<'part', 'filters-menu'>;
type Component = NodeComponent<'part'>;
type CategoryRaw = Required<FiltersMenu>['categories'][number];
type Filter = CategoryRaw['filters'][number] & {
    id: string;
};

// Valid filter ids are determined from FilterMenu where all
// filters are first defined before attached to actual content further down the page.
const getValidFilterIds = (components: Component[]): string[] => {
    const filterMenus = components.filter((component): component is FilterMenuComponent => {
        return component?.part?.descriptor === 'no.nav.navno:filters-menu';
    });

    if (filterMenus.length === 0) {
        return [];
    }

    // Note: There should only be one filter-menu on a product page
    // but for the sake of 'catch em all' - do a map on the array anyway.
    const availableFilterIds = filterMenus
        .map((filterMenu: FilterMenuComponent): string[] => {
            const filterCategories = forceArray(
                filterMenu.part.config?.['no-nav-navno']?.['filters-menu']?.categories
            );

            const filterIds = filterCategories
                .map((category) => {
                    const filters = forceArray(category.filters) as Filter[];

                    return filters.map((filter) => filter.id);
                })
                .flat();

            return filterIds;
        })
        .flat();

    return availableFilterIds;
};

const cleanComponentForInvalidFilterId = (
    component: Component,
    validFilterIds: string[]
): { component: Component; wasCleaned: boolean } => {
    const partName = component.part.descriptor.split(':')[1] as PartComponentName;

    if (partName === 'filters-menu') {
        return { component, wasCleaned: false };
    }

    if (!component.part.config?.['no-nav-navno']) {
        return { component, wasCleaned: false };
    }

    const config = (component.part.config?.['no-nav-navno'] as PartConfigs)?.[partName] as any;
    const filters = config?.filters as string[];

    if (!filters) {
        return { component, wasCleaned: false };
    }

    const filtersAsArray = forceArray(filters);

    if (filtersAsArray.length === 0) {
        return { component, wasCleaned: false };
    }

    const componentHasInvalidFilters = filtersAsArray.some(
        (filter: string) => !validFilterIds.includes(filter)
    );

    if (!componentHasInvalidFilters) {
        return { component, wasCleaned: false };
    }

    const cleanedFilters = filtersAsArray.filter((filter: string) =>
        validFilterIds.includes(filter)
    );

    // Mutates the component before returning
    config.filters = cleanedFilters;

    return { component, wasCleaned: componentHasInvalidFilters };
};

const removeInvalidFilterIds = (req: Request) => {
    const content = portalLib.getContent();
    if (!content) {
        logger.error(`Could not get contextual content from request path - ${req.rawPath}`);
        return;
    }

    const repo = getRepoConnection({ repoId: CONTENT_ROOT_REPO_ID, branch: 'draft' });

    const nodeContent = repo.get<Content>({ key: content._id });

    if (!nodeContent?.components) {
        return;
    }

    const allComponents = forceArray(nodeContent.components) as Component[];
    const validFilterIds = getValidFilterIds(allComponents);

    let somePartsWereCleaned = false;

    const cleanedComponents = allComponents.map((partComponent) => {
        if (partComponent.type !== 'part' || !partComponent.part) {
            return partComponent;
        }
        const { component, wasCleaned } = cleanComponentForInvalidFilterId(
            partComponent,
            validFilterIds
        );

        if (wasCleaned) {
            somePartsWereCleaned = true;
        }

        return component;
    });

    if (!somePartsWereCleaned) {
        return;
    }

    repo.modify({
        key: nodeContent._id,
        editor: (content: DynamicContentRepoNode) => {
            return {
                ...content,
                components: cleanedComponents,
            };
        },
    });
};

const dynamicPageController = (req: Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        removeInvalidFilterIds(req);
    }

    return frontendProxy(req);
};

export const get = dynamicPageController;
