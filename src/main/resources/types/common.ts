import { ComponentName } from './components/component-config';
import { ContentType } from './content-types/content-config';

export type RepoBranch = 'master' | 'draft';

export type Descriptor<
    Name extends string | ComponentName | ContentType = string
> = `no.nav.navno:${Name}`;
