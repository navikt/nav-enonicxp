import repoLib from '/lib/xp/repo';
import nodeLib, { RepoConnection } from '/lib/xp/node';
import { logger } from '../utils/logging';
import { runInContext } from '../utils/branch-context';
import { searchRepo } from '../constants';

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
        return true;
    }

    logger.info(`Created new search repo with id ${searchRepo}`);
    return true;
};

const createBaseNodes = (repo: RepoConnection) => {
    if (!repo.exists(`/_deletionQueue`)) {
        repo.create({ _name: '_deletionQueue' });
    }
};

export const initSearchRepo = () =>
    runInContext({ asAdmin: true }, () => {
        const facetsRepoExists = createSearchRepo();
        if (!facetsRepoExists) {
            return;
        }

        const repo = nodeLib.connect({
            repoId: searchRepo,
            branch: 'master',
        });

        createBaseNodes(repo);
    });
