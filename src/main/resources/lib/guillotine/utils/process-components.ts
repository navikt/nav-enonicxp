import { Region } from '/lib/xp/portal';
import { PortalComponent } from '../../../types/components/component-portal';
import { NodeComponent } from '../../../types/components/component-node';

type Regions = Record<string, Region>;
type GuillotineComponent = NodeComponent & { fragment?: string };

// Component config in the components-array is stored in a <app-name>.<component-name> sub-object
// Move this data down to the base config object, to match the XP page-object structure
const destructureConfig = (component: any) => {
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
export const destructureComponent = (component: any): any => {
    // Move this data down to the base object, to match the XP page-object structure
    const { page, part, layout, image, text, ...rest } = component;

    const destructuredComponent = {
        ...page,
        ...part,
        ...layout,
        ...image,
        ...text,
        ...rest,
    };

    const config = destructureConfig(destructuredComponent);

    return {
        ...destructuredComponent,
        ...(config && { config }),
    };
};

const insertsComponentsIntoRegions = (
    parentComponent: PortalComponent,
    componentsArray: GuillotineComponent[]
): PortalComponent => {
    const { path, regions } = parentComponent;

    // Strip trailing slash
    const parentPath = path.replace(/\/$/, '');

    if (!regions) {
        // log.info(`No regions found on component ${parentPath}`);
        return parentComponent;
    }

    const regionsWithComponents = Object.entries(regions).reduce((acc, [regionName, region]) => {
        const regionPath = `${parentPath}/${regionName}`;

        // log.info(`Getting components for region ${regionPath}...`);

        const regionComponents = componentsArray.reduce((acc, component) => {
            if (!component.path.startsWith(regionPath)) {
                return acc;
            }

            const regionComponent = region.components.find(
                (regionComponent) => regionComponent.path === component.path
            );

            // log.info(`Found component: ${regionComponent}`);
            if (!regionComponent) {
                return acc;
            }

            const { fragment } = component;

            if (fragment) {
                log.info(`Fragment: ${JSON.stringify(component)}`);
                return [
                    ...acc,
                    {
                        type: 'fragment',
                        path: component.path,
                        fragment: insertsComponentsIntoRegions(regionComponent, componentsArray),
                    } as PortalComponent,
                ];
            }

            return [...acc, insertsComponentsIntoRegions(regionComponent, componentsArray)];
        }, [] as PortalComponent[]);

        // log.info(`Found components for region ${regionPath}: ${JSON.stringify(regionComponents)}`);

        return {
            ...acc,
            [regionName]: {
                name: regionName,
                components: regionComponents,
            },
        };
    }, {} as Regions);

    // log.info(`Components for region ${parentPath}: ${JSON.stringify(regionsWithComponents)}`);

    return { ...parentComponent, regions: regionsWithComponents };
};

// Inserts components from a guillotine query into the matching regions of the page object
// The page-tree structure is what the frontend uses for rendering, and is also what the components
// editor in content studio supports
export const buildPageComponentTree = ({
    page,
    components,
}: {
    page?: PortalComponent<'page'>;
    components?: GuillotineComponent[];
}) => {
    if (!page || page.type !== 'page') {
        return {};
    }

    if (!components || components.length === 0) {
        return page;
    }

    log.info(`Page: ${JSON.stringify(page)}`);
    log.info(`Components: ${JSON.stringify(components)}`);

    return insertsComponentsIntoRegions(page, components);
};

export const buildFragmentComponentTree = (components: GuillotineComponent[]) => {
    const rootComponent = components?.find((component: any) => component.path === '/');
    if (!rootComponent) {
        return {};
    }

    const destructuredComponent = destructureComponent(rootComponent);

    if (destructuredComponent.type !== 'layout') {
        return destructuredComponent;
    }

    // Layouts can contain multiple components in regions, which need special treatment
    const regions = components.reduce((acc: any, component: any) => {
        const regionName = component.path?.split('/')[1];
        if (!regionName) {
            return acc;
        }

        const region = acc[regionName] || { components: [], name: regionName };

        const { fragment } = component;

        if (fragment) {
            return {
                ...acc,
                [regionName]: {
                    ...region,
                    components: [
                        ...region.components,
                        {
                            type: 'fragment',
                            path: component.path,
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
    }, {});

    return { ...destructuredComponent, regions };
};
