import { ComponentName } from './components/component-config';
import { CustomContentName } from './content-types/content-config';

export type RepoBranch = 'master' | 'draft';

export type Descriptor<
    Name extends string | ComponentName | CustomContentName = string
> = `no.nav.navno:${Name}`;
