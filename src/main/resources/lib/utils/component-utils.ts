import * as portalLib from '/lib/xp/portal';
import { Component } from '/lib/xp/portal';
import { getRepoConnection } from '../repos/repo-utils';
import { Content } from '/lib/xp/content';
import * as commonLib from '/lib/xp/common';
import { NodeComponent } from '../../types/components/component-node';
import { ArrayOrSingle, PickByFieldType } from '../../types/util-types';
import { ComponentConfigAll } from '../../types/components/component-config';
import { COMPONENT_APP_KEY } from '../constants';
import { forceArray } from './array-utils';

// TODO: clean up this mess :D

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

    // @ts-ignore (component[component.type] is always a valid field)
    const componentProps = component[type];
    if (!componentProps) {
        return null;
    }

    const { descriptor, config } = componentProps;
    if (!descriptor || !config) {
        return null;
    }

    const componentKey = descriptor.split(':')[1];

    return config?.[COMPONENT_APP_KEY]?.[componentKey];
};

export const getComponentConfigByPath = (
    path: string,
    components?: ArrayOrSingle<NodeComponent>
) => {
    const foundComponent = forceArray(components).find((component) => component.path === path);
    return getComponentConfig(foundComponent);
};

type ConfigWithAnchorId = Component['config'] & {
    anchorId?: string;
};

const configHasAnchorId = (config?: ConfigWithAnchorId): config is ConfigWithAnchorId =>
    !!config?.anchorId;

const componentHasUniqueAnchorId = (content: any, currentComponent: Component) => {
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

type StringFieldsExcludingAnchorId<Config> = keyof Omit<
    PickByFieldType<Required<Config>, string>,
    'anchorId'
>;

export const generateAnchorIdField = <Config extends ComponentConfigAll & { anchorId?: string }>(
    req: XP.Request,
    idSourceField: StringFieldsExcludingAnchorId<Config>,
    idSourceDefaultValue?: string
) => {
    const contentId = portalLib.getContent()?._id;
    if (!contentId) {
        return;
    }

    const component = portalLib.getComponent();
    if (!component) {
        return;
    }

    const repo = getRepoConnection({
        repoId: req.repositoryId,
        branch: req.branch,
    });

    const content = repo.get<Content>(contentId);

    if (componentHasUniqueAnchorId(content, component)) {
        return;
    }

    repo.modify<Content>({
        key: contentId,
        editor: (content) => {
            const components = forceArray(content.components);
            const config = getComponentConfigByPath(component.path, components) as Config;

            if (!config) {
                return content;
            }

            if (!config[idSourceField] && idSourceDefaultValue !== undefined) {
                (config as any)[idSourceField] = idSourceDefaultValue;
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

                (config as ConfigWithAnchorId).anchorId = idExists ? undefined : newId;
            }

            return content;
        },
    });
};
