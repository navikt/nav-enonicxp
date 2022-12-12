import contentLib, { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { logger } from '../utils/logging';
import { runInContext } from '../utils/branch-context';
import { SearchConfigDescriptor } from '../../types/content-types/content-config';
import { forceArray } from '../utils/nav-utils';
import { getSearchRepoConnection } from './utils';
import { SearchConfigData } from '../../types/content-types/search-config';

type SearchConfig = Content<SearchConfigDescriptor>;

let searchConfig: SearchConfig | null = null;

const validateQueries = (facets: SearchConfigData['fasetter'], repo: RepoConnection) => {
    let isValid = true;

    forceArray(facets).forEach((facet) => {
        try {
            repo.query({
                start: 0,
                count: 0,
                query: facet.ruleQuery,
            });
        } catch (e) {
            logger.error(
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
                logger.error(
                    `Invalid query specified for underfacet [${facet.facetKey}/${uf.facetKey}] ${uf.name}: ${uf.ruleQuery} - Error: ${e}`
                );
                isValid = false;
            }
        });
    });

    return isValid;
};

const validateFields = (fields: SearchConfigData['fields'], repo: RepoConnection) => {
    let isValid = true;

    try {
        repo.query({
            start: 0,
            count: 0,
            query: `fulltext("test", "${fields}", "OR")`,
        });
    } catch (e) {
        logger.error(`Invalid fields specified in search config: ${fields} - Error: ${e}`);
        isValid = false;
    }

    return isValid;
};

const validateKeys = (facets: SearchConfigData['fasetter']) => {
    let isValid = true;

    forceArray(facets).forEach((facet, index, array) => {
        const facetKeyIsDuplicate =
            array.findIndex((facet2) => facet.facetKey === facet2.facetKey) !== index;

        if (facetKeyIsDuplicate) {
            isValid = false;
            logger.error(`Facet key is not unique: ${facet.facetKey} (${facet.name})`);
        }

        forceArray(facet.underfasetter).forEach((uf, ufIndex, ufArray) => {
            const ufKeyIsDuplicate =
                ufArray.findIndex((uf2) => uf.facetKey === uf2.facetKey) !== ufIndex;

            if (ufKeyIsDuplicate) {
                isValid = false;
                logger.error(
                    `Underfacet key is not unique: ${facet.facetKey}/${uf.facetKey} (${uf.name})`
                );
            }
        });
    });

    return isValid;
};

const validateConfig = (config: SearchConfig) => {
    const repo = getSearchRepoConnection();

    if (
        !validateFields(config.data.fields, repo) ||
        !validateQueries(config.data.fasetter, repo) ||
        !validateKeys(config.data.fasetter)
    ) {
        logger.critical('Search config failed to validate!');
        return false;
    }

    return true;
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

    if (!validateConfig(newSearchConfig)) {
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
