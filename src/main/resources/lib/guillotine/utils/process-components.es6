// TODO: See if some of this can be simplified a bit...

// Component config in the components-array is stored in a <app-name>.<component-name> sub-object
// Move this data down to the base config object, to match the XP page-object structure
const destructureConfig = (component) => {
    const { descriptor, config } = component;

    if (!descriptor || !config) {
        return null;
    }

    // Field names from Guillotine queries are not consistent when it comes to dash/underscore.
    // configAsJson returns dash, while config {<field>} converts to underscore.
    // We have to account for both... -_-
    const componentNameDash = descriptor.split(':')[1];
    if (!componentNameDash) {
        return null;
    }

    const componentNameUnderscore = componentNameDash.replace(/-/g, '_');

    return {
        ...(config['no-nav-navno'] && config['no-nav-navno'][componentNameDash]),
        ...(config['no_nav_navno'] && config['no_nav_navno'][componentNameUnderscore]),
    };
};

// Component data in the components-array is stored in type-specific sub-objects
const destructureComponent = (component) => {
    // Move this data down to the base object, to match the XP page-object structure
    const { page, part, layout, image, text, ...rest } = component;

    const destructured = {
        ...page,
        ...part,
        ...layout,
        ...image,
        ...text,
        ...rest,
    };

    const config = destructureConfig(destructured);

    return {
        ...destructured,
        ...(config && { config }),
    };
};

// Takes a fragment-component from a Guillotine query and transforms the
// data structure into what content studio expects
const insertComponentsIntoFragment = (fragment, components) => {
    if (!components) {
        return null;
    }

    const rootComponent = components.find((component) => component.path === '/');
    if (rootComponent.type !== 'layout') {
        return {
            ...fragment,
            fragment: {
                ...destructureComponent(rootComponent),
            },
        };
    }

    log.info(`Components: ${JSON.stringify(components)}`);

    // Layouts can contain multiple components in regions, which need special treatment
    const regions = components.reduce((regionsAcc, component) => {
        const regionName = component.path?.split('/')[1];
        if (!regionName) {
            return regionsAcc;
        }

        const region = regionsAcc[regionName] || { components: [], name: regionName };
        region.components.push(destructureComponent(component));

        return { ...regionsAcc, [regionName]: region };
    }, {});

    return {
        ...fragment,
        fragment: {
            ...destructureComponent(rootComponent),
            regions,
        },
    };
};

// Merge data from the components array into the equivalent nested components from the page-object
// Data from the components array should take precedence, as this has resolved content refs
const mergeComponents = (componentsFromPage, componentsArray) =>
    componentsFromPage.map((pageComponent) => {
        const foundComponent = componentsArray.find(
            (arrayComponent) => arrayComponent.path === pageComponent.path
        );

        if (!foundComponent) {
            return insertComponents(pageComponent, componentsArray);
        }

        const destructuredComponent = destructureComponent(foundComponent);
        const config = { ...pageComponent.config, ...destructuredComponent.config };

        return insertComponents(
            {
                ...pageComponent,
                ...destructuredComponent,
                config,
            },
            componentsArray
        );
    });

const insertComponents = (obj, componentsArray) => {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    return Object.entries(obj).reduce((accObj, [key, value]) => {
        if (Array.isArray(value)) {
            if (key === 'components') {
                return { ...accObj, components: mergeComponents(value, componentsArray) };
            }

            return {
                ...accObj,
                [key]: value.map((item) => insertComponents(item, componentsArray)),
            };
        }

        if (value && typeof value === 'object') {
            return { ...accObj, [key]: insertComponents(value, componentsArray) };
        }

        return accObj;
    }, obj);
};

const mergeComponentsIntoPage = (content) => {
    const { page, components } = content;

    if (!page) {
        return {};
    }

    if (!components || components.length === 0) {
        return page;
    }

    const pageComponent = destructureComponent(
        components.find((component) => component.type === 'page')
    );
    const pageWithPageComponent = { ...page, ...pageComponent };

    return insertComponents(pageWithPageComponent, components);
};

const getPortalFragmentContent = (content) => {
    const { components } = content;

    const rootComponent = components?.find((component) => component.path === '/');
    if (!rootComponent) {
        return content;
    }

    return {
        ...content,
        fragment: { ...insertComponentsIntoFragment(rootComponent, components).fragment },
        components: undefined,
    };
};

module.exports = { mergeComponentsIntoPage, destructureComponent, getPortalFragmentContent };
