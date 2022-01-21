import { Component } from '/lib/xp/portal';

type Descriptor<Name extends string = string> = `no.nav.navno${Name}`;

export type ComponentType =
    | 'part'
    | 'layout'
    | 'page'
    | 'image'
    | 'text'
    | 'fragment';

export type PortalComponent<Config = any> = Exclude<
    Component<Config>,
    'type' | 'descriptor'
> & {
    type: ComponentType;
    descriptor: Descriptor;
};

export type NodeComponent<
    Type extends ComponentType | unknown = unknown,
    Config = any
> = { path: string } & (Type extends ComponentType
    ? TypedNodeComponent<Type, Config>
    : UnknownNodeComponent);

type TypedNodeComponent<Type extends ComponentType, Config = any> = {
    type: Type;
} & Record<Type, ComponentProps<Config>>;

type UnknownNodeComponent = { type: ComponentType } & Partial<{
    [key in ComponentType]: ComponentProps<any>;
}>;

type ComponentProps<
    ComponentName extends string | unknown,
    Config = any
> = ComponentName extends string
    ? NamedComponentProps<ComponentName, Config>
    : UnknownComponentProps;

type NamedComponentProps<ComponentName extends string, Config> = {
    descriptor: Descriptor<ComponentName>;
    config: {
        'no-nav-navno': Record<ComponentName, Config>;
    };
};

type UnknownComponentProps = {
    descriptor: Descriptor;
    config: { 'no-nav-navno': Record<string, { [key: string]: any }> };
};
