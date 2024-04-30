import * as repoLib from '/lib/xp/repo';
import { RepoConnection } from '/lib/xp/node';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { SEARCH_REPO_ID } from '../constants';
import { getSearchRepoConnection, SEARCH_REPO_CONFIG_NODE } from './utils';

const CONFIG_EXTERNAL_NODE_KEY = `/${SEARCH_REPO_CONFIG_NODE}`;

const getSearchRepo = () => {
    try {
        return repoLib.get(SEARCH_REPO_ID);
    } catch (e) {
        logger.error(`Error while getting search repo - ${e}`);
        return null;
    }
};

const createSearchRepo = () => {
    const existingRepo = getSearchRepo();
    if (existingRepo) {
        logger.info(`Search repo ${SEARCH_REPO_ID} already exists, no action needed`);
        return true;
    }

    const newRepo = repoLib.create({
        id: SEARCH_REPO_ID,
    });

    if (!newRepo) {
        logger.critical(`Failed to create search repo with id ${SEARCH_REPO_ID}!`);
        return false;
    }

    logger.info(`Created new search repo with id ${SEARCH_REPO_ID}`);
    return true;
};

const createBaseNodes = (repo: RepoConnection) => {
    if (!repo.exists(CONFIG_EXTERNAL_NODE_KEY)) {
        repo.create({ _name: SEARCH_REPO_CONFIG_NODE });
        logger.info(`Created node in search repo: ${SEARCH_REPO_CONFIG_NODE}`);
    }
};

export const initSearchRepo = () =>
    runInContext({ asAdmin: true }, () => {
        const searchRepoExists = createSearchRepo();
        if (!searchRepoExists) {
            return;
        }

        const repo = getSearchRepoConnection();

        createBaseNodes(repo);
    });
