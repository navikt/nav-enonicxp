import {
    NodeComponentAny,
    PortalComponent,
    PortalComponentAny,
} from '../../types/components/components';
import { forceArray } from '../nav-utils';
import portalLib from '/lib/xp/portal';
import nodeLib from '/lib/xp/node';
import commonLib from '/lib/xp/common';
import contentLib from '/lib/xp/content';
import {
    ComponentConfig,
    ComponentName,
} from '../../types/components/component-configs';
import { PickByFieldType } from '../../types/util-types';

const appKey = 'no-nav-navno';

// Used to separate keys/ids from descriptive helper text in values returned from macro custom-selectors
const macroDescriptionSeparator = ' ';

export const getKeyWithoutMacroDescription = (key: string) =>
    key?.split(macroDescriptionSeparator)[0];

export const appendMacroDescriptionToKey = (key: string, description: string) =>
    `${key}${macroDescriptionSeparator}${description}`;

export const getComponentConfig = (component?: NodeComponentAny) => {
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

    const componentKey = descriptor.split(':')[1] as ComponentName;

    return config[appKey]?.[componentKey];
};

export const getComponentConfigByPath = (
    path: string,
    components: NodeComponentAny[]
) => {
    const foundComponent = forceArray(components).find(
        (component) => component.path === path
    );
    return getComponentConfig(foundComponent);
};

const configHasAnchorIdField = (config: any): config is { anchorId: string } =>
    !!config?.anchorId;

const componentHasUniqueAnchorId = (
    content: any,
    currentComponent: PortalComponentAny
) => {
    const config = currentComponent?.config;
    if (!configHasAnchorIdField(config)) {
        return false;
    }

    const currentAnchorId = config.anchorId;

    const components = forceArray(content.components);

    const isDuplicate = components.some((component) => {
        const config = getComponentConfig(component);

        return (
            configHasAnchorIdField(config) &&
            config.anchorId === currentAnchorId &&
            component.path !== currentComponent.path
        );
    });

    return !isDuplicate;
};

export const generateAnchorIdField = <
    Config extends ComponentConfig & { anchorId?: string }
>(
    req: XP.Request,
    idSourceField: keyof Omit<
        PickByFieldType<Required<Config>, string>,
        'anchorId'
    >,
    idSourceDefaultValue?: string
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
            editor: (content: any) => {
                const components = forceArray(content.components);

                const config = getComponentConfigByPath(
                    component.path,
                    components
                ) as Config;

                if (!config) {
                    return content;
                }

                if (!config[idSourceField]) {
                    // @ts-ignore
                    config[idSourceField] = idSourceDefaultValue;
                }

                const fieldValue = config[idSourceField] as unknown as string;

                if (fieldValue && fieldValue !== idSourceDefaultValue) {
                    const id = commonLib.sanitize(fieldValue);
                    const idExists = components.some((component) => {
                        const _config = getComponentConfig(component);
                        if (configHasAnchorIdField(_config)) {
                            _config.anchorId === id;
                        }
                    });

                    config.anchorId = idExists ? undefined : id;
                }

                return content;
            },
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
