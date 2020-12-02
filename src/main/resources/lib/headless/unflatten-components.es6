// Component config in the components-array is stored in a <app-name>.<region-name> sub-object
// Move this data down to the base config object, to match the XP page-object structure
const destructureConfig = (component) => {
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

// Component data in the components-array is stored in type-specific sub-objects
// Move this data down to the base object, to match the XP page-object structure
const destructureComponent = (component) => {
    const { page, part, layout, image, text, fragment, ...rest } = component;

    const destructured = {
        ...page,
        ...part,
        ...layout,
        ...image,
        ...text,
        ...fragment,
        ...rest,
    };

    const config = destructureConfig(destructured);

    return {
        ...destructured,
        ...(config && { config }),
    };
};

// Merge data from the components array into the equivalent nested components from the page-object
// Data from the components array should take precedence, as this has resolved content refs
const mergeComponents = (componentsFromPage, componentsArray) =>
    componentsFromPage.map((pageComponent) => {
        const foundComponent = componentsArray.filter(
            (arrayComponent) => arrayComponent.path === pageComponent.path
        )[0];

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

    return Object.keys(obj).reduce((accObj, key) => {
        const value = obj[key];

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

    return insertComponents(page, components);
};

module.exports = { mergeComponentsIntoPage, destructureComponent };
