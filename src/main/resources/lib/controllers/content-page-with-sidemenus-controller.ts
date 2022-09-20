import portalLib from '/lib/xp/portal';
import nodeLib, { NodeContent, RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { NodeComponent } from '../../types/components/component-node';
import { contentRepo } from '../constants';
import { FiltersMenuPartConfig } from 'site/parts/filters-menu/filters-menu-part-config';
import { PartComponentName, PartConfigs } from 'types/components/component-config';
import { forceArray } from '../utils/nav-utils';

type ContentPageWithSideMenusNodeContent = NodeContent<
    Content<'no.nav.navno:content-page-with-sidemenus'>
>;
type ContentPageWithSidemenusRepoNode = RepoNode<
    Content<'no.nav.navno:content-page-with-sidemenus'>
>;

type FilterMenuComponent = NodeComponent<'part', 'filters-menu'>;
type PartComponent = NodeComponent<'part'>;

type CategoryRaw = Required<FiltersMenuPartConfig>['categories'][number];
type Filter = CategoryRaw['filters'][number] & {
    id: string;
};

// Valid filter ids are determined from FilterMenu where all
// filters are first defined before attached to actual content further down the page.
const getValidFilterIds = (components: PartComponent[]): string[] => {
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
                filterMenu.part.config?.['no-nav-navno']['filters-menu'].categories
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

const cleanComponentForInvalidFilterId = (component: PartComponent, validFilterIds: string[]) => {
    const partName = component.part.descriptor.split(':')[1] as PartComponentName;

    if (partName === 'filters-menu') {
        return component;
    }

    const config = (component.part.config?.['no-nav-navno'] as PartConfigs)[partName] as any;
    const filters = config?.filters as string[];

    if (!filters) {
        return component;
    }

    const filtersAsArray = forceArray(filters);

    if (filtersAsArray.length === 0) {
        return component;
    }

    const cleanedFilters = filtersAsArray.filter((filter: any) => validFilterIds.includes(filter));

    config.filters = cleanedFilters;

    return component;
};

const removeInvalidFilterIds = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (!content) {
        logger.error(`Could not get contextual content from request path - ${req.rawPath}`);
        return;
    }

    if (content.type !== 'no.nav.navno:content-page-with-sidemenus') {
        logger.error(`Invalid type for content page controller - ${content._id}`);
        return;
    }

    const repo = nodeLib.connect({ repoId: contentRepo, branch: 'draft' });

    const nodeContent = repo.get<ContentPageWithSideMenusNodeContent>({ key: content._id });

    if (!nodeContent?.components) {
        return;
    }

    const allComponents = forceArray(nodeContent.components) as PartComponent[];

    const validFilterIds = getValidFilterIds(allComponents);

    const cleanedComponents = allComponents.map((partComponent) => {
        if (partComponent.type !== 'part') {
            return partComponent;
        }
        return cleanComponentForInvalidFilterId(partComponent, validFilterIds);
    });

    repo.modify({
        key: nodeContent._id,
        editor: (content: ContentPageWithSidemenusRepoNode) => {
            return {
                ...content,
                components: cleanedComponents,
            };
        },
    });
};

const contentPageWithSidemenusController = (req: XP.Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        removeInvalidFilterIds(req);
    }

    return frontendProxy(req);
};

export const get = contentPageWithSidemenusController;
