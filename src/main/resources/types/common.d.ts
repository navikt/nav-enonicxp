import { ComponentName } from './components/component-config';
import { CustomContentName } from './content-types/content-config';

export type RepoBranch = 'master' | 'draft';

export type Locale = 'no' | 'nn' | 'en' | 'se';

export type NavNoDescriptor<Name extends string | ComponentName | CustomContentName = string> =
    `no.nav.navno:${Name}`;

export type BaseQueryParams = {
    branch: RepoBranch;
    params: {
        ref: string;
    };
    throwOnErrors: boolean;
};
