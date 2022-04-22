import { Region } from '/lib/xp/portal';
import { PortalComponent } from '../../../types/components/component-portal';
import { NodeComponent } from '../../../types/components/component-node';
import { ComponentType } from '../../../types/components/component-config';

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
    components: GuillotineComponent[],
    fragments: PortalComponent<'fragment'>[]
): PortalComponent => {
    const { path, regions } = parentComponent;

    // Strip trailing slash
    const parentPath = path.replace(/\/$/, '');

    if (!regions) {
        return parentComponent;
    }

    const regionsWithComponents = Object.entries(regions).reduce((acc, [regionName, region]) => {
        const regionPath = `${parentPath}/${regionName}`;

        const regionComponents = components.reduce((acc, component) => {
            const { path, type } = component;

            if (!path.startsWith(regionPath)) {
                return acc;
            }

            if (type === 'fragment') {
                const fragment = fragments.find((fragment) => fragment.path === component.path);

                if (!fragment) {
                    return acc;
                }

                return [...acc, fragment];
            }

            const regionComponent = region.components.find(
                (regionComponent) => regionComponent.path === component.path
            );

            if (!regionComponent) {
                return acc;
            }

            return [
                ...acc,
                insertsComponentsIntoRegions(
                    { ...regionComponent, ...destructureComponent(component) },
                    components,
                    fragments
                ),
            ];
        }, [] as PortalComponent[]);

        return {
            ...acc,
            [regionName]: {
                name: regionName,
                components: regionComponents,
            },
        };
    }, {} as Regions);

    return { ...parentComponent, regions: regionsWithComponents };
};

// Inserts components from a guillotine query into the matching regions of the page object
// The page-tree structure is what the frontend uses for rendering, and is also what the components
// editor in content studio supports
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

    // log.info(`Page: ${JSON.stringify(page)}`);
    // log.info(`Components: ${JSON.stringify(components)}`);
    // log.info(`Fragments: ${JSON.stringify(fragments)}`);

    const pageComponent = components.find((component) => component.path === '/');

    return insertsComponentsIntoRegions(
        { ...page, ...destructureComponent(pageComponent) },
        components,
        fragments
    );
};

export const buildFragmentComponentTree = (
    components: GuillotineComponent[],
    unresolvedComponentTypes?: { type: ComponentType; path: string }[]
) => {
    const rootComponent = components.find((component: any) => component.path === '/');
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
    }, {});

    return { ...destructuredComponent, regions };
};
