import { Component as XpPortalComponent } from '/lib/xp/portal';
import {
    ComponentConfigAll,
    ComponentConfigs,
    ComponentName,
    ComponentType,
} from './component-config';
import { Descriptor } from '../common';

// This type is used in the page object on a content, and when using portalLib.getComponent()
type PortalComponentMapper<Type, Name> = Type extends keyof ComponentConfigs
    ? Name extends keyof ComponentConfigs[Type] & ComponentName
        ? {
              type: Type;
              config?: ComponentConfigs[Type][Name];
              descriptor: Descriptor<Name>;
          }
        : never
    : never;

export type PortalComponent<Type extends ComponentType = ComponentType> = PortalComponentMapper<
    Type,
    ComponentName
> &
    XpPortalComponent<ComponentConfigAll>;

// TODO: add regions
