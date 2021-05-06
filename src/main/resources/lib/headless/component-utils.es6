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
    const foundComponent = components?.find((component) => component.path === path);
    return getComponentConfig(foundComponent);
};

module.exports = { getComponentConfigByPath, getComponentConfig };
