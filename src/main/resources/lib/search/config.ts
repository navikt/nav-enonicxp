import contentLib, { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { runInContext } from '../utils/branch-context';
import { SearchConfigDescriptor } from '../../types/content-types/content-config';
import { forceArray } from '../utils/nav-utils';
import { getSearchRepoConnection } from './utils';

let searchConfig: Content<SearchConfigDescriptor> | null = null;

const validateQueries = (config: Content<SearchConfigDescriptor>) => {
    const repo = getSearchRepoConnection();
    let isValid = true;

    forceArray(config.data.fasetter).forEach((facet) => {
        try {
            repo.query({
                start: 0,
                count: 0,
                query: facet.ruleQuery,
            });
        } catch (e) {
            logger.critical(
                `Invalid query specified for facet [${facet.facetKey}] ${facet.name} - ${facet.ruleQuery}`
            );
            isValid = false;
        }

        forceArray(facet.underfasetter).forEach((uf) => {
            try {
                repo.query({
                    start: 0,
                    count: 0,
                    query: uf.ruleQuery,
                });
            } catch (e) {
                logger.critical(
                    `Invalid query specified for underfacet [${facet.facetKey}/${uf.facetKey}] ${uf.name} - ${uf.ruleQuery}`
                );
                isValid = false;
            }
        });
    });

    return isValid;
};

export const revalidateSearchConfigCache = () => {
    const searchConfigHits = runInContext(
        { branch: 'master' },
        () =>
            contentLib.query({
                start: 0,
                count: 2,
                sort: 'createdTime ASC',
                contentTypes: ['navno.nav.no.search:search-config2'],
            }).hits
    );

    if (searchConfigHits.length === 0) {
        logger.critical(`No search config found!`);
        return;
    }

    if (searchConfigHits.length > 1) {
        logger.critical(`Multiple search configs found! Using oldest.`);
    }

    const newSearchConfig = searchConfigHits[0];

    if (!validateQueries(newSearchConfig)) {
        logger.critical(`Failed to validate search facet queries!`);
        return;
    }

    logger.info('Updated search config cache');
    searchConfig = newSearchConfig;
};

export const getSearchConfig = () => {
    if (!searchConfig) {
        revalidateSearchConfigCache();
    }

    return searchConfig;
};
