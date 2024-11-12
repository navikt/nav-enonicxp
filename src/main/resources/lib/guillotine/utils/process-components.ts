import { Region } from '/lib/xp/portal';
import { PortalComponent } from '../../../types/components/component-portal';
import { GuillotineUnresolvedComponentType } from '../queries/run-sitecontent-query';
import { ComponentType } from '../../../types/components/component-config';

// TODO: consider refactoring this mess :D

// These functions are used for processing component-objects from Guillotine queries into a consistent structure
// before serving to the frontend.
//
// There are two ways to get component data from a query (and we have to use both to get all the data we need):
//
// The "pageAsJson" field retrieves the full component tree-structure, with raw config data. This includes the full
// regions structure of every contained component, even if the regions are empty. However this does not allow deeper
// resolving of dependencies, or custom resolver functions.
//
// The "components(<args>)" field retrieves components as a flat array. This allows for certain resolver functionality
// that pageAsJson is missing, however it does not include any information about component regions, unless those regions
// actually contains components. Components retrieved from this field also has a different structure from what XP uses
// internally, which is handled by the destructure<Component/Config> functions
//
// We basically use the page(AsJson) object as our final structure, but with the more fully resolved component-configs
// inserted into their matching regions.

type Regions = Record<string, Region>;

export type GuillotineComponent = {
    type: ComponentType;
    path: string;
    descriptor: string;
    config: {
        'no-nav-navno': any;
        no_nav_navno: any;
    };
    page: any;
    part: any;
    layout: any;
    image: any;
    text: any;
    fragment: any;
};

// Component configs in the components-array are stored in <app-name>.<component-name> sub-objects
// Move this data down to the base config object, to match the XP page-object structure
const destructureConfig = (component: GuillotineComponent) => {
    const { descriptor, config } = component;

    if (!descriptor || !config) {
        return {};
    }

    // Field names from Guillotine queries are not consistent when it comes to dash/underscore.
    // configAsJson returns dash, while config {<field>} converts to underscore.
    // We have to account for both... -_-
    const componentNameDash = descriptor.split(':')[1];
    if (!componentNameDash) {
        return {};
    }

    const componentNameUnderscore = componentNameDash.replace(/-/g, '_');

    return {
        ...(config['no-nav-navno'] && config['no-nav-navno'][componentNameDash]),
        ...(config['no_nav_navno'] && config['no_nav_navno'][componentNameUnderscore]),
    };
};

const replaceSingleString = (str: string): string => {
    const replacements: [string, RegExp, string][] = [
        ['NAV Hjelpemiddelsentral', /NAV Hjelpemiddelsentral/g, 'Nav hjelpemiddelsentral'],
        ['NAV Hjelpemidler', /NAV Hjelpemidler/g, 'Nav hjelpemidler'],
        ['NAV', /NAV/g, 'Nav'],
    ];

    return replacements.reduce(
        (acc, [search, regexp, replace]) =>
            str.includes(search) ? acc.replace(regexp, replace) : acc,
        str
    );
};

// This is a temporary replacement function as part of the NAV => Nav process
// To be removed when we have completely run the script as part 2.
const replaceNAVwithNav = (obj: any): any => {
    if (typeof obj === 'string') {
        return replaceSingleString(obj);
    }

    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map((item) => replaceNAVwithNav(item));
    }

    // Reduce to construct a new object with replaced values
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        acc[key] =
            typeof value === 'string' ? replaceSingleString(value) : replaceNAVwithNav(value);
        return acc;
    }, {} as any);
};

// Component data in the components-array is stored in type-specific sub-objects
// Move this data down to the base object, to match the XP page-object structure
export const destructureComponent = (component: GuillotineComponent) => {
    const { page, part, layout, image, text, ...rest } = component;

    const destructuredComponent = {
        ...page,
        ...part,
        ...layout,
        ...image,
        ...text,
        ...rest,
    };

    const config = replaceNAVwithNav(destructureConfig(destructuredComponent));

    return {
        ...destructuredComponent,
        config,
    };
};

export const insertComponentsIntoRegions = (
    parentComponent: PortalComponent,
    components: GuillotineComponent[],
    fragments: PortalComponent<'fragment'>[]
): PortalComponent => {
    const { path, regions } = parentComponent;

    if (!regions || !path) {
        return parentComponent;
    }

    // Strip trailing slash (only applicable to the page root component)
    const parentPath = path.replace(/\/$/, '');

    const regionsWithComponents = Object.entries(regions).reduce<Regions>(
        (acc, [regionName, region]) => {
            // This is the component path for the current region. We use this to filter out components
            // belonging to this region
            const targetRegionPath = `${parentPath}/${regionName}`;

            const regionComponents = components.reduce<PortalComponent[]>((acc, component) => {
                const { path, type } = component;

                const componentRegionPath = path.split('/').slice(0, -1).join('/');

                if (componentRegionPath !== targetRegionPath) {
                    return acc;
                }

                // Fragments should already have their regions populated correctly, and require no further processing
                if (type === 'fragment') {
                    const fragment = fragments.find((fragment) => fragment.path === path);

                    if (!fragment) {
                        return acc;
                    }

                    return [...acc, fragment];
                }

                const regionComponent = region.components.find(
                    (regionComponent) => regionComponent.path === path
                );

                if (!regionComponent) {
                    return acc;
                }

                return [
                    ...acc,
                    insertComponentsIntoRegions(
                        { ...regionComponent, ...destructureComponent(component) },
                        components,
                        fragments
                    ),
                ];
            }, []);

            return {
                ...acc,
                [regionName]: {
                    name: regionName,
                    components: regionComponents,
                },
            };
        },
        {}
    );

    return { ...parentComponent, regions: regionsWithComponents };
};

// Inserts components from a guillotine query into the matching regions of the page object
export const buildPageComponentTree = ({
    page,
    components,
    fragments,
}: {
    page?: PortalComponent<'page'>;
    components: GuillotineComponent[];
    fragments: PortalComponent<'fragment'>[];
}) => {
    if (!page || page.type !== 'page') {
        return {};
    }

    if (components.length === 0) {
        return page;
    }

    const pageComponent = components.find((component) => component.path === '/');

    if (!pageComponent) {
        return page;
    }

    return insertComponentsIntoRegions(
        { ...page, ...destructureComponent(pageComponent) },
        components,
        fragments
    );
};

// Fragments have slightly different structures and constraints, so we handle them separately
export const buildFragmentComponentTree = (
    components: GuillotineComponent[],
    unresolvedComponentTypes?: GuillotineUnresolvedComponentType[]
) => {
    const rootComponent = components.find((component) => component.path === '/');
    if (!rootComponent) {
        return {};
    }

    const destructuredComponent = destructureComponent(rootComponent);

    // Only layout components can have regions in a fragment, any other types does not require any further processing
    if (destructuredComponent.type !== 'layout') {
        return destructuredComponent;
    }

    // Layouts can contain multiple components in regions, which need special treatment
    const regions = components.reduce((acc, component) => {
        const regionName = component.path?.split('/')[1];
        if (!regionName) {
            return acc;
        }

        const region = acc[regionName] || { components: [], name: regionName };

        const isNestedFragment = unresolvedComponentTypes?.some(
            (fragment) => fragment.type === 'fragment' && fragment.path === component.path
        );

        if (isNestedFragment) {
            return {
                ...acc,
                [regionName]: {
                    ...region,
                    components: [
                        ...region.components,
                        {
                            type: 'fragment',
                            path: '/',
                            fragment: destructureComponent(component),
                        },
                    ],
                },
            };
        }

        return {
            ...acc,
            [regionName]: {
                ...region,
                components: [...region.components, destructureComponent(component)],
            },
        };
    }, {} as Regions);

    return { ...destructuredComponent, regions };
};
