import { ComponentConfigs, ComponentName, ComponentType } from './component-config';
import { Descriptor } from '../common';

export const componentAppKey = 'no-nav-navno';

type NodeComponentMapper<Type, Name> = Type extends keyof ComponentConfigs
    ? Name extends keyof ComponentConfigs[Type] & ComponentName
        ? {
              [type in Type]: {
                  descriptor: Descriptor<Name>;
                  config?: {
                      [componentAppKey]: {
                          [key in Name]: ComponentConfigs[Type][Name];
                      };
                  };
              };
          } & { [NotType in Exclude<ComponentType, Type>]: undefined } & {
              type: Type;
          }
        : never
    : never;

// This type is used in the components array retrieved from a raw node
// through a nodeLib repo connection
export type NodeComponent = NodeComponentMapper<ComponentType, ComponentName> & { path: string };
