// From content types in the search app

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

export type SearchConfigDescriptor = 'navno.nav.no.search:search-config2';

export type SearchExternalResourceData = {
    url: string;
};

export type SearchExternalResourceDescriptor = 'navno.nav.no.search:search-api2';
