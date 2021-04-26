const portalLib = require('/lib/xp/portal');
const nodeLib = require('/lib/xp/node');
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
        log.info('No filter menus found');
        return null;
    }

    return filterMenus
        .map((filterMenu) => {
            const config = getComponentConfig(filterMenu);

            return config?.categories?.map((category) =>
                category.filters?.map((filter) => generateHit(category, filter))
            );
        })
        .flat();
};

const filterSelector = (req) => {
    const { ids, query } = req;

    const content = portalLib.getContent();

    const hits = generateHits(req);
    log.info(`Hits: ${JSON.stringify(hits)}`);

    return {
        status: 200,
        body: {
            total: 10,
            count: 10,
            hits: hits,
        },
    };
};

exports.get = filterSelector;
