import { ComponentConfigs, ComponentName, ComponentType } from './component-config';
import { NavNoDescriptor } from '../common';
import { COMPONENT_APP_KEY } from '../../lib/constants';

type NodeComponentMapper<Type, Name> = Type extends 'fragment'
    ? {
          type: Type;
          path: string;
          fragment: {
              id: string;
          };
      }
    : Type extends keyof ComponentConfigs
    ? Name extends keyof ComponentConfigs[Type] & ComponentName
        ? {
              [type in Type]: {
                  descriptor: NavNoDescriptor<Name>;
                  config?: {
                      [COMPONENT_APP_KEY]: {
                          [name in Name]: ComponentConfigs[Type][Name];
                      };
                  };
              };
          } & {
              type: Type;
          }
        : never
    : never;

// This type is used in the components array retrieved from a raw node
// through a nodeLib repo connection
export type NodeComponent<
    Type extends ComponentType = ComponentType,
    Name extends ComponentName = ComponentName,
> = NodeComponentMapper<Type, Name> & {
    path: string;
};
