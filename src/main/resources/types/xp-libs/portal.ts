import { Content } from '../content-types/content-config';
import xpPortalLib from '*/lib/xp/portal';
import { PortalComponent } from '../components/component-portal';
import { ComponentName, ComponentType } from '../components/component-config';
import { Override } from '../util-types';

interface PortalLibOverride {
    getComponent<
        Type extends ComponentType = ComponentType,
        Name extends ComponentName = ComponentName
    >(): PortalComponent<Type, Name>;

    getContent(): Content;
}

export type PortalLibrary = Override<xpPortalLib.PortalLibrary, PortalLibOverride>;
