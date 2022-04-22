import portalLib from '/lib/xp/portal';
import nodeLib from '/lib/xp/node';
import { forceArray } from '../../lib/utils/nav-utils';
import { getComponentConfig } from '../../lib/utils/component-utils';
import { FiltersMenuPartConfig } from '../../site/parts/filters-menu/filters-menu-part-config';

type Hit = XP.CustomSelectorServiceResponseHit;

type CategoryRaw = Required<FiltersMenuPartConfig>['categories'][number];

// Filters have a unique id that is set programmatically and is not part of the schema from which
// the type is generated
type Filter = CategoryRaw['filters'][number] & {
    id: string;
};
type Category = CategoryRaw & { filters: Filter[] };

const getFilterMenus = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (!content) {
        throw new Error('Ugyldig context, forsøk å laste inn editoren på nytt (F5)');
    }

    const repo = nodeLib.connect({
        repoId: req.repositoryId,
        branch: req.branch,
    });

    const components = forceArray(repo.get(content._id)?.components);

    return components.filter(
        (component) => component.part?.descriptor === `${app.name}:filters-menu`
    );
};

const generateHit = (category: Category, filter: Filter): Hit => ({
    id: filter.id,
    displayName: filter.filterName,
    description: `Kategori: ${category.categoryName}`,
});

const generateHits = (req: XP.Request) => {
    const filterMenus = getFilterMenus(req);

    return filterMenus
        .map((filterMenu) => {
            const config = getComponentConfig(filterMenu);
            const categories = forceArray(config?.categories) as Category[];

            return categories.map((category) =>
                forceArray(category.filters)?.map((filter) => generateHit(category, filter))
            );
        })
        .flat();
};

export const get = (req: XP.Request) => {
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
                    },
                ],
            },
        };
    }
};
