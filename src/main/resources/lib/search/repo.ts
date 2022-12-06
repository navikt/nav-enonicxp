import repoLib from '/lib/xp/repo';
import { RepoConnection } from '/lib/xp/node';
import { logger } from '../utils/logging';
import { runInContext } from '../utils/branch-context';
import { searchRepo } from '../constants';
import {
    getSearchRepoConnection,
    searchRepoContentBaseNode,
    searchRepoDeletionQueueBaseNode,
} from './utils';

const createSearchRepo = () => {
    const existingRepo = repoLib.get(searchRepo);
    if (existingRepo) {
        logger.info(`Search repo ${searchRepo} already exists, no action needed`);
        return true;
    }

    const newRepo = repoLib.create({
        id: searchRepo,
    });

    if (!newRepo) {
        logger.critical(`Failed to create search repo with id ${searchRepo}!`);
        return false;
    }

    logger.info(`Created new search repo with id ${searchRepo}`);
    return true;
};

const createBaseNodes = (repo: RepoConnection) => {
    if (!repo.exists(`/${searchRepoDeletionQueueBaseNode}`)) {
        repo.create({ _name: searchRepoDeletionQueueBaseNode });
    }
    if (!repo.exists(`/${searchRepoContentBaseNode}`)) {
        repo.create({ _name: searchRepoContentBaseNode });
    }
};

export const initSearchRepo = () =>
    runInContext({ asAdmin: true }, () => {
        const facetsRepoExists = createSearchRepo();
        if (!facetsRepoExists) {
            return;
        }

        const repo = getSearchRepoConnection();

        createBaseNodes(repo);
    });
