import * as repoLib from '/lib/xp/repo';
import { RepoConnection } from '/lib/xp/node';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { SEARCH_REPO_ID } from '../constants';
import {
    getSearchRepoConnection,
    SEARCH_REPO_CONFIG_NODE,
    SEARCH_REPO_CONTENT_BASE_NODE,
    SEARCH_REPO_DELETION_QUEUE_BASE_NODE,
    SEARCH_REPO_UPDATE_STATE_NODE,
} from './search-utils';
import { forceArray } from '../utils/array-utils';

const baseNodeKey = `/${SEARCH_REPO_CONTENT_BASE_NODE}`;
const deletionNodeKey = `/${SEARCH_REPO_DELETION_QUEUE_BASE_NODE}`;
const stateNodeKey = `/${SEARCH_REPO_UPDATE_STATE_NODE}`;
const configNodeKey = `/${SEARCH_REPO_CONFIG_NODE}`;

type UpdateQueueEntry = {
    contentId: string;
    repoId: string;
};

type UpdateQueueState = {
    isQueuedUpdateAll?: boolean;
    queuedContentUpdates?: UpdateQueueEntry[];
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
    setUpdateState({ isQueuedUpdateAll: true, queuedContentUpdates: [] });
};

export const queueUpdateForContent = (contentId: string, repoId: string) => {
    const currentUpdateState = getUpdateQueue();
    const newEntry = { contentId, repoId };

    setUpdateState({
        queuedContentUpdates: [
            ...(currentUpdateState?.queuedContentUpdates
                ? forceArray(currentUpdateState.queuedContentUpdates)
                : []),
            newEntry,
        ],
    });
};

export const clearSearchNodeUpdateQueue = () => {
    setUpdateState({ isQueuedUpdateAll: false, queuedContentUpdates: [] });
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
        repo.create({ _name: SEARCH_REPO_DELETION_QUEUE_BASE_NODE });
        logger.info(`Created node in search repo: ${SEARCH_REPO_DELETION_QUEUE_BASE_NODE}`);
    }
    if (!repo.exists(baseNodeKey)) {
        repo.create({ _name: SEARCH_REPO_CONTENT_BASE_NODE });
        logger.info(`Created node in search repo: ${SEARCH_REPO_CONTENT_BASE_NODE}`);
    }
    if (!repo.exists(stateNodeKey)) {
        repo.create({ _name: SEARCH_REPO_UPDATE_STATE_NODE });
        logger.info(`Created node in search repo: ${SEARCH_REPO_UPDATE_STATE_NODE}`);
    }
    if (!repo.exists(configNodeKey)) {
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
