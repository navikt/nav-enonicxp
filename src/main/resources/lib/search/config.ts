import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as clusterLib from '/lib/xp/cluster';
import { RepoConnection } from '/lib/xp/node';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { SearchConfigDescriptor } from '../../types/content-types/content-config';
import { forceArray } from '../utils/nav-utils';
import { getSearchRepoConnection, searchRepoConfigNode } from './utils';
import { SearchConfigData } from '../../types/content-types/search-config';

type SearchConfig = Content<SearchConfigDescriptor>;
type PersistedSearchConfig = { config?: SearchConfig };

const searchConfigKey = `/${searchRepoConfigNode}`;

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
    try {
        repo.query({
            start: 0,
            count: 0,
            query: `fulltext("test", "${fields}", "OR")`,
        });
        return true;
    } catch (e) {
        logger.error(`Invalid fields specified in search config: ${fields} - Error: ${e}`);
        return false;
    }
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

const validateConfig = (config: SearchConfig, repo: RepoConnection) => {
    let isValid = true;

    if (!validateFields(config.data.fields, repo)) {
        isValid = false;
    }

    if (!validateQueries(config.data.fasetter, repo)) {
        isValid = false;
    }

    if (!validateKeys(config.data.fasetter)) {
        isValid = false;
    }

    return isValid;
};

const persistValidConfig = (config: SearchConfig, repo: RepoConnection) => {
    try {
        repo.modify<PersistedSearchConfig>({
            key: searchConfigKey,
            editor: (node) => ({
                ...node,
                config,
            }),
        });
    } catch (e) {
        logger.error(`Error while persisting search config - ${e}`);
    }
};

const getLastValidConfig = (repo: RepoConnection) => {
    const configNode = repo.get<PersistedSearchConfig>(searchConfigKey);
    if (!configNode?.config?.data?.fasetter) {
        logger.critical(`No valid search config found in repo!`);
        return null;
    }

    return configNode.config;
};

// Returns true if the latest config is valid
export const revalidateSearchConfigCache = () => {
    const searchRepoConnection = getSearchRepoConnection();

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
        logger.critical('No search config found! Falling back to last known valid config.');
        searchConfig = getLastValidConfig(searchRepoConnection);
        return false;
    }

    if (searchConfigHits.length > 1) {
        logger.critical(`Multiple search configs found! Trying oldest...`);
    }

    const newSearchConfig = searchConfigHits[0];

    if (!validateConfig(newSearchConfig, searchRepoConnection)) {
        logger.critical(
            'Search config failed to validate! Falling back to last known valid config.'
        );
        searchConfig = getLastValidConfig(searchRepoConnection);
        return false;
    }

    logger.info('Updated search config');
    searchConfig = newSearchConfig;

    if (clusterLib.isMaster()) {
        persistValidConfig(searchConfig, searchRepoConnection);
    }

    return true;
};

export const getSearchConfig = () => {
    if (!searchConfig) {
        revalidateSearchConfigCache();
    }

    return searchConfig;
};
