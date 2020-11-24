// Gets the regions nested directly under the root component
const getRegions = (components, rootComponent) => {
    const rootPath = rootComponent.path;
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
        const prevComponents = regions[regionName]?.components || [];
        const newComponent = unflattenComponents(components, component);

        return {
            ...regions,
            [regionName]: {
                name: regionName,
                components: [...prevComponents, newComponent],
            },
        };
    }, {});
};

const getConfig = (component) => {
    const { descriptor, config } = component;
    if (!descriptor || !config) {
        return null;
    }

    // Field names from Guillotine queries are not consistent when it comes
    // to dash/underscore. We have to account for both... -_-
    const regionNameDash = descriptor.split(':')[1];
    if (!regionNameDash) {
        return null;
    }

    const regionNameUnderscore = regionNameDash.replace(/-/g, '_');

    return {
        ...(config['no-nav-navno'] && config['no-nav-navno'][regionNameDash]),
        ...(config['no_nav_navno'] && config['no_nav_navno'][regionNameUnderscore]),
    };
};

// Component data from guillotine is stored in a type-specific sub-object
// Move this data down to the base component-object, to match the XP page-object
// structure
const getDestructuredComponent = (component) => {
    const { page, part, layout, image, text, fragment, ...rest } = component;

    return {
        ...page,
        ...part,
        ...layout,
        ...image,
        ...text,
        ...fragment,
        ...rest,
    };
};

const unflattenComponents = (components, rootComponent) => {
    const destructuredComponent = getDestructuredComponent(rootComponent);

    const config = getConfig(destructuredComponent);
    const regions = getRegions(components, destructuredComponent);

    return {
        ...destructuredComponent,
        ...(config && { config }),
        ...(regions && { regions }),
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
