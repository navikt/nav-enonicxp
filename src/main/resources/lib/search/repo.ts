import * as repoLib from '/lib/xp/repo';
import { RepoConnection } from '/lib/xp/node';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { SEARCH_REPO_ID } from '../constants';
import {
    getSearchRepoConnection,
    searchRepoConfigNode,
    searchRepoContentBaseNode,
    searchRepoDeletionQueueBaseNode,
    searchRepoUpdateStateNode,
} from './utils';
import { forceArray } from '../utils/nav-utils';

const baseNodeKey = `/${searchRepoContentBaseNode}`;
const deletionNodeKey = `/${searchRepoDeletionQueueBaseNode}`;
const stateNodeKey = `/${searchRepoUpdateStateNode}`;
const configNodeKey = `/${searchRepoConfigNode}`;

type UpdateQueueState = {
    isQueuedUpdateAll?: boolean;
    queuedContentIdUpdates?: string[] | null;
};

export const getUpdateQueue = () => {
    const repo = getSearchRepoConnection();
    return repo.get<UpdateQueueState>(stateNodeKey);
};

const setUpdateState = (state: UpdateQueueState) => {
    const repo = getSearchRepoConnection();
    repo.modify({
        key: stateNodeKey,
        editor: (node) => ({
            ...node,
            ...state,
        }),
    });
};

export const queueUpdateAll = () => {
    setUpdateState({ isQueuedUpdateAll: true, queuedContentIdUpdates: null });
};

export const queueUpdateForContent = (contentId: string) => {
    const currentUpdateState = getUpdateQueue();
    setUpdateState({
        queuedContentIdUpdates: [
            ...(currentUpdateState?.queuedContentIdUpdates
                ? forceArray(currentUpdateState.queuedContentIdUpdates)
                : []),
            contentId,
        ],
    });
};

export const clearSearchNodeUpdateQueue = () => {
    setUpdateState({ isQueuedUpdateAll: false, queuedContentIdUpdates: null });
};

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
    if (!repo.exists(deletionNodeKey)) {
        repo.create({ _name: searchRepoDeletionQueueBaseNode });
        logger.info(`Created node in search repo: ${searchRepoDeletionQueueBaseNode}`);
    }
    if (!repo.exists(baseNodeKey)) {
        repo.create({ _name: searchRepoContentBaseNode });
        logger.info(`Created node in search repo: ${searchRepoContentBaseNode}`);
    }
    if (!repo.exists(stateNodeKey)) {
        repo.create({ _name: searchRepoUpdateStateNode });
        logger.info(`Created node in search repo: ${searchRepoUpdateStateNode}`);
    }
    if (!repo.exists(configNodeKey)) {
        repo.create({ _name: searchRepoConfigNode });
        logger.info(`Created node in search repo: ${searchRepoConfigNode}`);
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
