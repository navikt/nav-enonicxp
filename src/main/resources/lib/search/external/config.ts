import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as clusterLib from '/lib/xp/cluster';
import { RepoConnection } from '/lib/xp/node';
import { logger } from '../../utils/logging';
import { runInContext } from '../../context/run-in-context';
import { getSearchRepoConnection, SEARCH_REPO_EXTERNAL_CONFIG_NODE } from '../search-utils';
import { forceArray } from '../../utils/array-utils';
import { getRepoConnection } from '../../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../../constants';

type SearchConfig = Content<'no.nav.navno:search-config-v2'>;
type PersistedSearchConfig = { config?: SearchConfig };
type ConfigGroup = Pick<
    NonNullable<SearchConfig['data']['groupConfig']>[number],
    'titleKey' | 'ingressKey' | 'audienceKey' | 'textKey'
>;

const SEARCH_CONFIG_KEY = `/${SEARCH_REPO_EXTERNAL_CONFIG_NODE}`;

let searchConfig: SearchConfig | null = null;

const validateConfigGroup = (group: ConfigGroup, repo: RepoConnection) => {
    const keysString = [group.titleKey, group.ingressKey, group.audienceKey, group.textKey]
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

    const defaultIsValid = validateConfigGroup(config.data.defaultConfig, repo);

    const groupsAreValid = forceArray(config.data.groupConfig).reduce((acc, group) => {
        const groupIsValid = validateConfigGroup(group, repo);
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
const revalidateSearchConfigCache = () => {
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

    if (clusterLib.isMaster()) {
        persistValidConfig(searchConfig, searchRepoConnection);
    }

    logger.info('Updated search config for external search');

    return true;
};

export const getExternalSearchConfig = () => {
    if (!searchConfig) {
        revalidateSearchConfigCache();
    }

    return searchConfig;
};
