import { ComponentName } from './components/component-config';

export type RepoBranch = 'master' | 'draft';

export type Descriptor<Name extends string | ComponentName = string> =
    `no.nav.navno:${Name}`;
