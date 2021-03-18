const portalLib = require('/lib/xp/portal');
const nodeLib = require('/lib/xp/node');
const contextLib = require('/lib/xp/context');
const { sanitize } = require('/lib/xp/common');
const controller = require('/lib/headless/controllers/component-preview-controller');

const getUniqueAnchorId = (prefix, components, suffix = 0) => {
    const id = `${sanitize(prefix)}${suffix ? `-${suffix}` : ''}`;
    const idExists = components.some((component) => getComponentConfig(component)?.anchorId === id);

    if (idExists) {
        return getUniqueAnchorId(prefix, components, suffix + 1);
    }

    return id;
};

const getComponentConfig = (component) =>
    component?.layout?.config?.['no-nav-navno']?.['section-with-header'];

const getComponentConfigByPath = (path, components) => {
    const component = components.find((component) => component.path === path);
    return getComponentConfig(component);
};

const generateAnchorIdFromTitle = (componentPath) => (content) => {
    const { components } = content;

    const config = getComponentConfigByPath(componentPath, components);

    if (config?.title) {
        config.anchorId = getUniqueAnchorId(config.title, components);
    }

    return content;
};

const componentHasUniqueAnchorId = (content, currentComponent) => {
    const currentAnchorId = currentComponent?.config?.anchorId;
    if (!currentAnchorId) {
        return false;
    }

    const { components } = content;

    const isDuplicate = components.some((component) => {
        const config = getComponentConfig(component);
        if (config?.anchorId === currentAnchorId && component.path !== currentComponent.path) {
            return true;
        }
    });

    return !isDuplicate;
};

exports.get = (req) => {
    if (req.mode === 'edit') {
        const context = contextLib.get();
        const contentId = req.path.split('/')[6];
        const component = portalLib.getComponent();

        const repo = nodeLib.connect({
            repoId: context.repository,
            branch: context.branch,
        });

        const content = repo.get(contentId);

        if (!componentHasUniqueAnchorId(content, component)) {
            repo.modify({
                key: contentId,
                editor: generateAnchorIdFromTitle(component.path),
            });
        }
    }

    return controller(req);
};
