import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { forceArray } from '../utils/array-utils';
import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { isMainDatanode } from '../cluster-utils/main-datanode';
import { getSearchRepoConnection, SEARCH_REPO_CONFIG_NODE } from './utils';

type SearchConfig = Content<'no.nav.navno:search-config-v2'>;
type PersistedSearchConfig = { config?: SearchConfig };
type KeysConfig = Partial<
    Pick<SearchConfig['data']['defaultKeys'], 'titleKey' | 'ingressKey' | 'textKey'>
>;

const SEARCH_CONFIG_KEY = `/${SEARCH_REPO_CONFIG_NODE}`;

let searchConfig: SearchConfig | null = null;

const validateKeysConfig = (keys: KeysConfig, repo: RepoConnection) => {
    const keysString = [keys.titleKey, keys.ingressKey, keys.textKey]
        .flat()
        .filter(Boolean)
        .join(',');

    try {
        repo.query({
            start: 0,
            count: 0,
            query: `fulltext("test", "${keysString}", "OR")`,
        });
        return true;
    } catch (e) {
        logger.error(`Invalid fields specified in search config: ${keysString} - Error: ${e}`);
        return false;
    }
};

const validateConfigs = (config: SearchConfig) => {
    const repo = getRepoConnection({ branch: 'master', repoId: CONTENT_ROOT_REPO_ID });

    const defaultIsValid = validateKeysConfig(config.data.defaultKeys, repo);

    const groupsAreValid = forceArray(config.data.contentGroups).reduce((acc, group) => {
        const groupKeys = group?.groupKeys;
        if (!groupKeys) {
            return acc;
        }

        const groupIsValid = validateKeysConfig(groupKeys, repo);
        return groupIsValid ? acc : false;
    }, true);

    return defaultIsValid && groupsAreValid;
};

const persistValidConfig = (config: SearchConfig, repo: RepoConnection) => {
    try {
        repo.modify<PersistedSearchConfig>({
            key: SEARCH_CONFIG_KEY,
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
    const configNode = repo.get<PersistedSearchConfig>(SEARCH_CONFIG_KEY);
    if (!configNode?.config) {
        logger.critical(`No valid search config found in repo!`);
        return null;
    }

    return configNode.config;
};

// Returns true if the latest config is valid
export const revalidateExternalSearchConfigCache = () => {
    const searchRepoConnection = getSearchRepoConnection();

    const searchConfigHits = runInContext(
        { branch: 'master' },
        () =>
            contentLib.query({
                start: 0,
                count: 2,
                sort: 'createdTime ASC',
                contentTypes: ['no.nav.navno:search-config-v2'],
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

    if (!validateConfigs(newSearchConfig)) {
        logger.critical(
            'Search config failed to validate! Falling back to last known valid config.'
        );
        searchConfig = getLastValidConfig(searchRepoConnection);
        return false;
    }

    searchConfig = newSearchConfig;

    if (isMainDatanode()) {
        persistValidConfig(searchConfig, searchRepoConnection);
    }

    logger.info('Updated search config for external search');

    return true;
};

export const getExternalSearchConfig = () => {
    if (!searchConfig) {
        revalidateExternalSearchConfigCache();
    }

    return searchConfig;
};
