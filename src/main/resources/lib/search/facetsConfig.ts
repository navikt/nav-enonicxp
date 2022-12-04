import contentLib, { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { SearchConfigDescriptor } from '../../types/content-types/content-config';
import { SearchConfig } from '../../types/content-types/search-config';

type FacetConfig = SearchConfig['fasetter'][number];
type UnderFacetConfig = FacetConfig['underfasetter'] extends Array<any>
    ? FacetConfig['underfasetter'][number]
    : undefined;

export const getFacetsConfig = (): Content<SearchConfigDescriptor> | null => {
    const facetsConfigHits = contentLib.query({
        start: 0,
        count: 2,
        sort: 'createdTime DESC',
        contentTypes: ['navno.nav.no.search:search-config2'],
    }).hits;

    if (facetsConfigHits.length === 0) {
        logger.critical(`No facets config found!`);
        return null;
    }

    if (facetsConfigHits.length > 1) {
        logger.critical(`Multiple facets configs found! Using oldest.`);
    }

    return facetsConfigHits[0];
};
