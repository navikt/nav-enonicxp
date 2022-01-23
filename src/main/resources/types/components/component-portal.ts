import { Component as XpPortalComponent } from '/lib/xp/portal';
import {
    ComponentConfigAll,
    ComponentConfigs,
    ComponentName,
    ComponentType,
} from './component-config';
import { Descriptor } from '../content';

// This type is returned when using portalLib.getComponent()
type PortalComponentMapper<Name, Type> = Type extends keyof ComponentConfigs
    ? Name extends keyof ComponentConfigs[Type] & ComponentName
        ? {
              type: Type;
              config: ComponentConfigs[Type][Name];
              descriptor: Descriptor<Name>;
          }
        : never
    : never;

export type PortalComponent = PortalComponentMapper<
    ComponentName,
    ComponentType
> &
    XpPortalComponent<ComponentConfigAll>;
