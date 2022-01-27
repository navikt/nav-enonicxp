import { PortalComponent } from '../../types/components/component-portal';
import { forceArray } from '../nav-utils';
import nodeLib from '/lib/xp/node';
import commonLib from '/lib/xp/common';
import { contentLib, portalLib } from '../xp-libs';
import { ComponentConfigAll } from '../../types/components/component-config';
import { PickByFieldType } from '../../types/util-types';
import { componentAppKey, NodeComponent } from '../../types/components/component-node';

// Used to separate keys/ids from descriptive helper text in values returned from macro custom-selectors
const macroDescriptionSeparator = ' ';

export const getKeyWithoutMacroDescription = (key: string) =>
    key?.split(macroDescriptionSeparator)[0];

export const appendMacroDescriptionToKey = (key: string, description: string) =>
    `${key}${macroDescriptionSeparator}${description}`;

export const getComponentConfig = (component?: NodeComponent) => {
    if (!component) {
        return null;
    }

    const { type } = component;
    if (!type) {
        return null;
    }

    // @ts-ignore
    // component[component.type] is always a valid field
    const componentProps = component[component.type];
    if (!componentProps) {
        return null;
    }

    const { descriptor, config } = componentProps;
    if (!descriptor || !config) {
        return null;
    }

    const componentKey = descriptor.split(':')[1];

    // @ts-ignore
    // Typescript can't infer the split literal type for componentKey
    return config?.[componentAppKey]?.[componentKey];
};

export const getComponentConfigByPath = (path: string, components: NodeComponent[]) => {
    const foundComponent = forceArray(components).find((component) => component.path === path);
    return getComponentConfig(foundComponent);
};

type ConfigWithAnchorId = PortalComponent['config'] & {
    anchorId?: string;
};
const configHasAnchorId = (config?: ConfigWithAnchorId): config is ConfigWithAnchorId =>
    !!config?.anchorId;

const componentHasUniqueAnchorId = (content: any, currentComponent: PortalComponent) => {
    const config = currentComponent?.config;
    if (!configHasAnchorId(config)) {
        return false;
    }

    const currentAnchorId = config.anchorId;

    const components = forceArray(content.components);

    const isDuplicate = components.some((component) => {
        const config = getComponentConfig(component);

        return (
            configHasAnchorId(config) &&
            config.anchorId === currentAnchorId &&
            component.path !== currentComponent.path
        );
    });

    return !isDuplicate;
};

export const generateAnchorIdField = <Config extends ComponentConfigAll & { anchorId?: string }>(
    req: XP.Request,
    idSourceField: keyof Omit<PickByFieldType<Required<Config>, string>, 'anchorId'>,
    idSourceDefaultValue?: string
) => {
    const contentId = portalLib.getContent()._id;
    const component = portalLib.getComponent();

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

                const config = getComponentConfigByPath(component.path, components) as Config;

                if (!config) {
                    return content;
                }

                if (!config[idSourceField] && idSourceDefaultValue !== undefined) {
                    // @ts-ignore
                    config[idSourceField] = idSourceDefaultValue;
                }

                const fieldValue = config[idSourceField] as unknown as string;

                if (fieldValue && fieldValue !== idSourceDefaultValue) {
                    const newId = commonLib.sanitize(fieldValue);

                    const idExists = components.some((component) => {
                        const _config = getComponentConfig(component);
                        if (configHasAnchorId(_config)) {
                            return _config.anchorId === newId;
                        }
                    });

                    config.anchorId = idExists ? undefined : newId;
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
