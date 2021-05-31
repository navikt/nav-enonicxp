const portalLib = require('/lib/xp/portal');
const nodeLib = require('/lib/xp/node');
const { forceArray } = require('/lib/nav-utils');
const { getComponentConfig } = require('/lib/headless/component-utils');

const getFilterMenus = (components) =>
    components?.filter((component) => component.part?.descriptor === `${app.name}:filters-menu`);

const generateHit = (category, filter) => ({
    id: filter.id,
    displayName: filter.filterName,
    description: `Kategori: ${category.categoryName}`,
});

const generateHits = (req) => {
    const contentId = portalLib.getContent()._id;

    const repo = nodeLib.connect({
        repoId: req.repositoryId,
        branch: req.branch,
    });

    const filterMenus = getFilterMenus(repo.get(contentId)?.components);
    if (!filterMenus?.length > 0) {
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
    const hits = generateHits(req);

    return {
        status: 200,
        body: {
            total: hits.length,
            count: hits.length,
            hits: hits,
        },
    };
};

exports.get = filterSelector;
