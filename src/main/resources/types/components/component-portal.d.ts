import { ComponentConfigs, ComponentName } from './component-config';
import { NavNoDescriptor } from '../common';

// This type is used in the page object on a content, and when using portalLib.getComponent()
export type PortalComponentMapper<Type, Name> = Type extends 'fragment'
    ? {
          type: Type;
          fragment?: string;
          config: undefined;
          descriptor: undefined;
      }
    : Type extends keyof ComponentConfigs
    ? Name extends keyof ComponentConfigs[Type] & ComponentName
        ? {
              type: Type;
              config?: ComponentConfigs[Type][Name];
              descriptor: NavNoDescriptor<Name>;
          }
        : never
    : never;

// TODO: add regions
