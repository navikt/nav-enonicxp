const portalLib = require('/lib/xp/portal');
const nodeLib = require('/lib/xp/node');
const { forceArray } = require('/lib/nav-utils');
const { sanitize } = require('/lib/xp/common');

const appKey = app.name.replace(/\./g, '-');

const getComponentConfig = (component) => {
    if (!component) {
        return null;
    }

    const { type } = component;
    if (!type) {
        return null;
    }

    const componentProps = component[type];
    if (!componentProps) {
        return null;
    }

    const { descriptor, config } = componentProps;
    if (!descriptor || !config) {
        return null;
    }

    const componentKey = descriptor.split(':')[1];

    return config?.[appKey]?.[componentKey];
};

const getComponentConfigByPath = (path, components) => {
    const foundComponent = forceArray(components).find((component) => component.path === path);
    return getComponentConfig(foundComponent);
};

const componentHasUniqueAnchorId = (content, currentComponent) => {
    const currentAnchorId = currentComponent?.config?.anchorId;
    if (!currentAnchorId) {
        return false;
    }

    const components = forceArray(content.components);

    const isDuplicate = components.some((component) => {
        const config = getComponentConfig(component);
        return config?.anchorId === currentAnchorId && component.path !== currentComponent.path;
    });

    return !isDuplicate;
};

const generateAnchorIdFromFieldValue = (componentPath, fieldKey, fieldDefaultValue) => (
    content
) => {
    const components = forceArray(content.components);

    const config = getComponentConfigByPath(componentPath, components);

    if (!config) {
        return content;
    }

    const fieldValue = config[fieldKey];

    if (!fieldValue && fieldDefaultValue) {
        config[fieldKey] = fieldDefaultValue;
    }

    if (fieldValue && fieldValue !== fieldDefaultValue) {
        const id = sanitize(fieldValue);
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

const generateAnchorIdField = (req, fieldKey, fieldDefaultValue) => {
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
            editor: generateAnchorIdFromFieldValue(component.path, fieldKey, fieldDefaultValue),
        });
    }
};

module.exports = { getComponentConfigByPath, getComponentConfig, generateAnchorIdField };
