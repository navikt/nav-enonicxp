import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as commonLib from '/lib/xp/common';
import { RepoConnection } from '/lib/xp/node';
import { forceArray } from '../utils/array-utils';
import { logger } from '../utils/logging';
import { getLayersData } from '../localization/layers-data';
import { getRepoConnection } from '../repos/repo-utils';
import { isMainDatanode } from '../cluster-utils/main-datanode';

// Names made only of these are left alone. This also keeps names which sanitize would still
// change, such as "_templates", Content Studio's temporary "__unnamed__" names, and the "_kap"
// and "_2" suffixes used in existing paths.
const VALID_NAME_PATTERN = /^[a-z0-9._-]+$/;

type NameNode = {
    _id: string;
    _name: string;
    _path: string;
    inherit?: string | string[];
};

const getParentPath = (path: string) => path.substring(0, path.lastIndexOf('/'));

// Adds -2, -3 etc if a sibling already has the name
const getAvailableName = (repo: RepoConnection, parentPath: string, name: string) => {
    let candidate = name;
    for (let suffix = 2; repo.exists(`${parentPath}/${candidate}`); suffix++) {
        candidate = `${name}-${suffix}`;
    }
    return candidate;
};

export const normalizeContentName = (repo: RepoConnection, nodeId: string) => {
    const node = repo.get<NameNode>(nodeId);
    if (!node || !node._path.startsWith('/content/') || VALID_NAME_PATTERN.test(node._name)) {
        return null;
    }

    // Inherited layer content gets the name from the root content through layer sync
    if (forceArray(node.inherit).includes('NAME')) {
        return null;
    }

    const newName = getAvailableName(
        repo,
        getParentPath(node._path),
        commonLib.sanitize(node._name)
    );

    repo.move({ source: node._id, target: newName });

    return newName;
};

const normalizeContentNamesOnEvent = (event: EnonicEvent) => {
    if (!isMainDatanode()) {
        return;
    }

    event.data.nodes.forEach(({ id, repo, branch }) => {
        if (branch !== 'draft' || !getLayersData().repoIdToLocaleMap[repo]) {
            return;
        }

        const repoConnection = getRepoConnection({ repoId: repo, branch: 'draft', asAdmin: true });

        try {
            const newName = normalizeContentName(repoConnection, id);
            if (newName) {
                logger.info(`Renamed content ${id} in repo ${repo} to normalized name ${newName}`);
            }
        } catch (e) {
            logger.error(`Failed to normalize name of content ${id} in repo ${repo} - ${e}`);
        }
    });
};

let hasSetupListeners = false;

export const activateContentNameNormalizationListener = () => {
    if (hasSetupListeners) {
        logger.error('Event listener for content name normalization was already started');
        return;
    }

    hasSetupListeners = true;

    eventLib.listener({
        type: '(node.created|node.duplicated|node.renamed)',
        localOnly: false,
        callback: normalizeContentNamesOnEvent,
    });

    logger.info('Started event listener for content name normalization');
};
