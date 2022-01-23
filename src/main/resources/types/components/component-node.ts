import {
    ComponentConfigs,
    ComponentName,
    ComponentType,
} from './component-config';
import { Descriptor } from '../content';

export const componentAppKey = 'no-nav-navno';

// This type is used in the components array retrieved from a raw node
// through a nodeLib repo connection
type NodeComponentMapper<Name, Type> = Type extends keyof ComponentConfigs
    ? Name extends keyof ComponentConfigs[Type] & ComponentName
        ? {
              [type in Type]: {
                  descriptor: Descriptor<Name>;
                  config: {
                      [componentAppKey]: {
                          [key in Name]: ComponentConfigs[Type][Name];
                      };
                  };
              };
          } & { [notType in Exclude<ComponentType, Type>]: undefined } & {
              type: Type;
          }
        : never
    : never;

export type NodeComponent = NodeComponentMapper<
    ComponentName,
    ComponentType
> & { path: string };

const test = {} as NodeComponent;

if (
    test.type === 'layout' &&
    test.layout.descriptor === 'no.nav.navno:section-with-header'
) {
    test.layout.config[componentAppKey]['section-with-header'].bgColor;
}
