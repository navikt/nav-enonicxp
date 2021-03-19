const portalLib = require('/lib/xp/portal');
const nodeLib = require('/lib/xp/node');
const contextLib = require('/lib/xp/context');
const { sanitize } = require('/lib/xp/common');
const controller = require('/lib/headless/controllers/component-preview-controller');

const componentName = __FILE__.split('/').slice(-2, -1)[0];
const defaultTitle = 'Seksjonstittel';

const getComponentConfig = (component) =>
    component?.layout?.config?.['no-nav-navno']?.[componentName];

const getComponentConfigByPath = (path, components) => {
    const component = components.find((component) => component.path === path);
    return getComponentConfig(component);
};

const generateAnchorIdFromTitle = (componentPath) => (content) => {
    const { components } = content;

    const config = getComponentConfigByPath(componentPath, components);

    if (!config) {
        return content;
    }

    const { title } = config;

    if (!title) {
        config.title = defaultTitle;
    }

    if (title !== defaultTitle) {
        const id = sanitize(title);
        const idExists = components.some(
            (component) => getComponentConfig(component)?.anchorId === id
        );
        if (idExists) {
            config.anchorId = undefined;
        } else {
            config.anchorId = id;
        }
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
        const contentId = portalLib.getContent()._id;
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
