import { Component as XpPortalComponent } from '/lib/xp/portal';
import {
    ComponentConfig,
    ComponentName,
    LayoutComponentName,
    LayoutConfigTypes,
    PageComponentName,
    PageConfigTypes,
    PartComponentName,
    PartConfigTypes,
} from './component-configs';

type Descriptor<Name extends string = string> = `no.nav.navno:${Name}`;

export type ComponentType = 'page' | 'layout' | 'part';
// | 'fragment'
// | 'image'
// | 'text';

// This type is returned when getting a component from the current context
// through portalLib.getComponent()
export type PortalComponentMapper<Name, Type> = Type extends 'part'
    ? Name extends PartComponentName
        ? {
              type: Type;
              config: PartConfigTypes[Name];
              descriptor: Descriptor<Name>;
          }
        : never
    : Type extends 'layout'
    ? Name extends LayoutComponentName
        ? {
              type: Type;
              config: LayoutConfigTypes[Name];
              descriptor: Descriptor<Name>;
          }
        : never
    : Type extends 'page'
    ? Name extends PageComponentName
        ? {
              type: Type;
              config: PageConfigTypes[Name];
              descriptor: Descriptor<Name>;
          }
        : never
    : never;

export type PortalComponent = PortalComponentMapper<
    ComponentName,
    ComponentType
> &
    XpPortalComponent<ComponentConfig>;

export type PortalComponentAny = XpPortalComponent<any> & {
    type: ComponentType;
    descriptor: Descriptor<ComponentName>;
};

const test = {} as PortalComponent;
if (test.type === 'layout') {
    if (test.descriptor === 'no.nav.navno:section-with-header') {
        test.config.anchorId;
    }
}

// This type is returned from the components array retrieved from a raw node
// through a nodeLib repo connection
type NodeComponentMapper<
    Name extends ComponentName,
    Type extends ComponentType
> = Type extends 'part'
    ? Name extends PartComponentName
        ? {
              type: Type;
              part: NodeComponentProps<Name, PartConfigTypes[Name]>;
          }
        : never
    : Type extends 'layout'
    ? Name extends LayoutComponentName
        ? {
              type: Type;
              layout: NodeComponentProps<Name, LayoutConfigTypes[Name]>;
          }
        : never
    : Type extends 'page'
    ? Name extends PageComponentName
        ? {
              type: Type;
              page: NodeComponentProps<Name, PageConfigTypes[Name]>;
          }
        : never
    : never;

type NodeComponentProps<
    Name extends ComponentName,
    Config extends ComponentConfig
> = {
    descriptor: Descriptor<Name>;
    config: {
        'no-nav-navno': { [key in Name]: Config };
    };
};

export type NodeComponent = NodeComponentMapper<
    ComponentName,
    ComponentType
> & { path: string };

export type NodeComponentAny = {
    [key in ComponentType]?: NodeComponentProps<ComponentName, ComponentConfig>;
} & {
    type: ComponentType;
    path: string;
};
