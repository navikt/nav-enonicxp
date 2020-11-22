const getNestedRegions = (components, rootPath) => {
    const nestedComponents = components.filter(
        (component) => component.path !== rootPath && component.path.startsWith(rootPath)
    );

    if (nestedComponents.length === 0) {
        return null;
    }

    return nestedComponents.reduce((regions, component) => {
        const pathSegments = component.path
            .replace(rootPath, '')
            .split('/')
            .filter((s) => s !== '');

        if (pathSegments.length !== 2) {
            return regions;
        }

        const regionName = pathSegments[0];
        const prevComponents = regions[regionName]?.components;
        const newComponent = unflattenComponents(components, component);

        return {
            ...regions,
            [regionName]: {
                name: regionName,
                components: [...(prevComponents || []), newComponent],
            },
        };
    }, {});
};

const unflattenComponents = (components, rootComponent) => {
    const { page, part, layout, image, text, fragment, ...rest } = rootComponent;

    const regions = getNestedRegions(components, rootComponent.path);

    return {
        ...page,
        ...part,
        ...layout,
        ...image,
        ...text,
        ...fragment,
        ...(regions && { regions }),
        ...rest,
    };
};

const componentsArrayToComponentsTree = (components) => {
    if (!components) {
        return undefined;
    }

    const rootComponent = components.filter((component) => component.path === '/')[0];

    if (!rootComponent) {
        return undefined;
    }

    return unflattenComponents(components, rootComponent);
};

module.exports = componentsArrayToComponentsTree;
