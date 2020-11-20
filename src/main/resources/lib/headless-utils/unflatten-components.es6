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
    const { path, page, part, layout, image, text, fragment, ...rest } = rootComponent;

    const regions = getNestedRegions(components, path);

    return {
        path,
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
        return {};
    }

    const pageComponent = components.filter((component) => component.type === 'page')[0];

    if (!pageComponent) {
        return {};
    }

    return unflattenComponents(components, pageComponent);
};

module.exports = componentsArrayToComponentsTree;
