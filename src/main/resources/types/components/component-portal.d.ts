import { ComponentConfigs, ComponentName, ComponentType } from './component-config';
import { NavNoDescriptor } from '../common';
import { Region } from '/lib/xp/portal';

// This type is used in the page object on a content, and when using portalLib.getComponent()
export type PortalComponent<
    Type extends ComponentType = ComponentType,
    Name extends ComponentName = ComponentName
> = {
    path: string;
    regions?: Record<string, Region>;
} & (Type extends 'fragment'
    ? {
          type: Type;
          fragment?: any;
          config?: undefined;
          descriptor?: undefined;
      }
    : Type extends keyof ComponentConfigs
    ? Name extends keyof ComponentConfigs[Type] & ComponentName
        ? {
              type: Type;
              config?: ComponentConfigs[Type][Name];
              descriptor: NavNoDescriptor<Name>;
          }
        : never
    : never);

// TODO: add regions
