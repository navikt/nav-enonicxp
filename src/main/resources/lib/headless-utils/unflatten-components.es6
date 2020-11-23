const getNestedRegions = (components, rootPath) => {
    const nestedComponents = components.filter(
        (component) => component.path !== rootPath && component.path.startsWith(rootPath)
    );

    if (nestedComponents.length === 0) {
        return null;
    }

    return nestedComponents.reduce((regions, component) => {
        // get the region path segments for the current component
        // example if rootPath == '/parentRegion/0'
        // /parentRegion/0/currentRegion/<currentIndex = 1>
        // -> ['current', 1]
        const pathSegments = component.path
            .replace(rootPath, '')
            .split('/')
            .filter((s) => s !== ''); // remove empty segments

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
    // Component data from guillotine is stored in a type-specific sub-object
    // Move this data down to the base component-object, to match the XP page-object
    // structure
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
