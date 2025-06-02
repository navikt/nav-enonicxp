import { Request } from '@enonic-types/core';
import * as portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from 'lib/repos/repo-utils';
import { getComponentConfig } from 'lib/utils/component-utils';
import { FiltersMenu } from '@xp-types/site/parts/filters-menu';
import { logger } from 'lib/utils/logging';
import { forceArray } from 'lib/utils/array-utils';
import { forceString } from 'lib/utils/string-utils';
import { customSelectorErrorIcon } from '../custom-selector-icons';

type CategoryRaw = Required<FiltersMenu>['categories'][number];

// Filters have a unique id that is set programmatically and is not part of the schema from which
// the type is generated
type Filter = CategoryRaw['filters'][number] & {
    id: string;
};
type Category = CategoryRaw & { filters: Filter[] };

const getFilterMenus = (req: Request) => {
    const content = portalLib.getContent();
    if (!content) {
        throw new Error('Ugyldig context, forsøk å laste inn editoren på nytt (F5)');
    }

    const repo = getRepoConnection({
        repoId: forceString(req.repositoryId),
        branch: forceString(req.branch),
    });

    const components = forceArray(repo.get<Content>(content._id)?.components);

    return components.filter(
        (component) =>
            component.type === 'part' && component.part?.descriptor === `${app.name}:filters-menu`
    );
};

const generateHit = (category: Category, filter: Filter) => ({
    id: filter.id,
    displayName: filter.filterName,
    description: `Kategori: ${category.categoryName}`,
});

const generateHits = (req: Request) => {
    const filterMenus = getFilterMenus(req);

    return filterMenus
        .map((filterMenu) => {
            const config = getComponentConfig(filterMenu);
            const categories = forceArray(config?.categories);

            return categories.map((category) =>
                forceArray(category.filters).map((filter) => {
                    if (!filter.id) {
                        throw new Error(
                            `Id-feil på "${filter.filterName}" - prøv å legge til filteret på nytt i filter-menyen`
                        );
                    }
                    return generateHit(category, filter);
                })
            );
        })
        .flat(2);
};

export const get = (req: Request) => {
    try {
        const hits = generateHits(req);

        return {
            status: 200,
            body: {
                total: hits.length,
                count: hits.length,
                hits: hits,
            },
        };
    } catch (e: any) {
        logger.error(`Filter selector error: ${e}`);

        return {
            status: 200,
            body: {
                total: 1,
                count: 1,
                hits: [
                    {
                        id: '',
                        displayName: 'Det oppsto en feil:',
                        description: e.toString(),
                        icon: customSelectorErrorIcon,
                    },
                ],
            },
        };
    }
};
