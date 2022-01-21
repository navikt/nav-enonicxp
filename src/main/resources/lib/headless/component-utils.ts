import {
    NodeComponent,
    ComponentType,
    PortalComponent,
} from '../../types/components';
import { forceArray } from '../nav-utils';
import portalLib from '/lib/xp/portal';
import nodeLib from '/lib/xp/node';
import commonLib from '/lib/xp/common';
import contentLib from '/lib/xp/content';

const appKey = 'no-nav-navno';

// Used to separate keys/ids from descriptive helper text in values returned from macro custom-selectors
const macroDescriptionSeparator = ' ';

export const getKeyWithoutMacroDescription = (key: string) =>
    key?.split(macroDescriptionSeparator)[0];

export const appendMacroDescriptionToKey = (key: string, description: string) =>
    `${key}${macroDescriptionSeparator}${description}`;

export const getComponentConfig = <Type extends ComponentType | unknown>(
    component: NodeComponent<Type>
) => {
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

export const getComponentConfigByPath = (
    path: string,
    components: NodeComponent[]
) => {
    const foundComponent = forceArray(components).find(
        (component) => component.path === path
    );
    return getComponentConfig(foundComponent);
};

const componentHasUniqueAnchorId = (
    content: any,
    currentComponent: PortalComponent
) => {
    const currentAnchorId = currentComponent?.config?.anchorId;
    if (!currentAnchorId) {
        return false;
    }

    const components = forceArray(content.components);

    const isDuplicate = components.some((component) => {
        const config = getComponentConfig(component);
        return (
            config?.anchorId === currentAnchorId &&
            component.path !== currentComponent.path
        );
    });

    return !isDuplicate;
};

const generateAnchorIdFromFieldValue =
    (componentPath: string, fieldKey: string, fieldDefaultValue: string) =>
    (content: any) => {
        const components = forceArray(content.components);

        const config = getComponentConfigByPath(componentPath, components);

        if (!config) {
            return content;
        }

        const fieldValue = config[fieldKey];

        if (!fieldValue && fieldDefaultValue) {
            config[fieldKey] = fieldDefaultValue;
        }

        if (fieldValue && fieldValue !== fieldDefaultValue) {
            const id = commonLib.sanitize(fieldValue);
            const idExists = components.some(
                (component) => getComponentConfig(component)?.anchorId === id
            );
            if (idExists) {
                config.anchorId = undefined;
            } else {
                config.anchorId = id;
            }
        }

        return content;
    };

export const generateAnchorIdField = (
    req: XP.Request,
    fieldKey: string,
    fieldDefaultValue: string
) => {
    const contentId = portalLib.getContent()._id;
    const component = portalLib.getComponent() as PortalComponent;

    const repo = nodeLib.connect({
        repoId: req.repositoryId,
        branch: req.branch,
    });

    const content = repo.get(contentId);

    if (!componentHasUniqueAnchorId(content, component)) {
        repo.modify({
            key: contentId,
            editor: generateAnchorIdFromFieldValue(
                component.path,
                fieldKey,
                fieldDefaultValue
            ),
        });
    }
};

export const findContentsWithFragmentComponent = (fragmentId: string) => {
    return contentLib.query({
        start: 0,
        count: 1000,
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'components.fragment.id',
                        values: [fragmentId],
                    },
                },
            },
        },
    }).hits;
};
