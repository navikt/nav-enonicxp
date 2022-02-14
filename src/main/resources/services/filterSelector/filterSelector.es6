const portalLib = require('/lib/xp/portal');
const nodeLib = require('/lib/xp/node');
const { forceArray } = require('/lib/utils/nav-utils');
const { getComponentConfig } = require('/lib/headless/component-utils');

const getFilterMenus = (req) => {
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

const generateHit = (category, filter) => ({
    id: filter.id,
    displayName: filter.filterName,
    description: `Kategori: ${category.categoryName}`,
});

const generateHits = (req) => {
    const filterMenus = getFilterMenus(req);
    if (!filterMenus.length > 0) {
        return [];
    }

    return filterMenus
        .map((filterMenu) => {
            const config = getComponentConfig(filterMenu);
            const categories = forceArray(config?.categories);

            return categories.map((category) =>
                forceArray(category.filters)?.map((filter) => generateHit(category, filter))
            );
        })
        .flat();
};

const filterSelector = (req) => {
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
    } catch (e) {
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

exports.get = filterSelector;
