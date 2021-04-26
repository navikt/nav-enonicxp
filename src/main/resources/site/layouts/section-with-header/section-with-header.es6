const portalLib = require('/lib/xp/portal');
const nodeLib = require('/lib/xp/node');
const { sanitize } = require('/lib/xp/common');
const controller = require('/lib/headless/controllers/component-preview-controller');
const { getComponentConfig } = require('/lib/headless/component-utils');
const { getComponentConfigByPath } = require('/lib/headless/component-utils');

const defaultTitle = 'Seksjonstittel';

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
        return config?.anchorId === currentAnchorId && component.path !== currentComponent.path;
    });

    return !isDuplicate;
};

exports.get = (req) => {
    if (req.mode === 'edit') {
        const contentId = portalLib.getContent()._id;
        const component = portalLib.getComponent();

        const repo = nodeLib.connect({
            repoId: req.repositoryId,
            branch: req.branch,
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
