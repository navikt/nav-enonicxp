// From the search-config2 type in the search app

import { ArrayOrSingle } from '../util-types';
import { ContentDescriptor } from './content-config';

export type ConfigFacet = {
    name: string;
    facetKey: string;
    ruleQuery: string;
    underfasetter?: ArrayOrSingle<{
        name: string;
        facetKey: string;
        ruleQuery: string;
    }>;
};

export interface SearchConfigData {
    contentTypes: ArrayOrSingle<ContentDescriptor>;
    fields: ArrayOrSingle<string>;
    fasetter: ArrayOrSingle<ConfigFacet>;
}
