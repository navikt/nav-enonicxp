const controller = require('/lib/headless/controllers/component-preview-controller');
const portalLib = require('/lib/xp/portal');
const nodeLib = require('/lib/xp/node');
const { forceArray } = require('/lib/nav-utils');
const { isUUID } = require('/lib/headless/uuid');
const { getComponentConfigByPath } = require('/lib/headless/component-utils');
const { generateUUID } = require('/lib/headless/uuid');

const insertIdIfNotExist = (obj) => {
    if (!isUUID(obj.id)) {
        log.info(`Generating UUID for ${JSON.stringify(obj)}`);
        obj.id = generateUUID();
    }
};

const generatePersistantIds = (componentPath) => (content) => {
    const { components } = content;

    const config = getComponentConfigByPath(componentPath, components);

    if (!config) {
        log.info('No config found!');
        return content;
    }

    const categories = forceArray(config.categories);

    categories?.forEach((category) => {
        insertIdIfNotExist(category);
        forceArray(category.filters)?.forEach((filter) => insertIdIfNotExist(filter));
    });

    return content;
};

exports.get = (req) => {
    if (req.mode === 'edit') {
        const contentId = portalLib.getContent()._id;
        const component = portalLib.getComponent();

        const repo = nodeLib.connect({
            repoId: req.repositoryId,
            branch: req.branch,
        });

        repo.modify({
            key: contentId,
            editor: generatePersistantIds(component.path),
        });
    }

    return controller;
};
