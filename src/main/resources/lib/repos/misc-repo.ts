import * as repoLib from '/lib/xp/repo';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { MISC_REPO_ID } from '../constants';
import { getRepoConnection } from './repo-utils';

// A repo for various things we need to persist, which we don't want to store in the content repos

const getMiscRepo = () => {
    try {
        return repoLib.get(MISC_REPO_ID);
    } catch (e) {
        logger.error(`Error while getting repo - ${e}`);
        return null;
    }
};

const createMiscRepo = () => {
    const existingRepo = getMiscRepo();
    if (existingRepo) {
        logger.info(`Repo ${MISC_REPO_ID} already exists, no action needed`);
        return true;
    }

    const newRepo = repoLib.create({
        id: MISC_REPO_ID,
    });

    if (!newRepo) {
        logger.critical(`Failed to create repo with id ${MISC_REPO_ID}!`);
        return false;
    }

    logger.info(`Created new repo with id ${MISC_REPO_ID}`);
    return true;
};

export const getMiscRepoConnection = () =>
    getRepoConnection({
        repoId: MISC_REPO_ID,
        branch: 'main',
        asAdmin: true,
    });

export const initMiscRepo = () => runInContext({ asAdmin: true }, createMiscRepo);
