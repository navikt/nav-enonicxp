import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { RepoConnection } from '/lib/xp/node';
import { hasInvalidCustomPath, hasValidCustomPath } from './custom-path-utils';
import { logger } from '../../utils/logging';
import { getLayersData } from '../../localization/layers-data';
import { isContentLocalized } from '../../localization/locale-utils';
import { getRepoConnection } from '../../utils/repo-utils';

const removeCustomPath = (contentId: string, repoConnection: RepoConnection) => {
    repoConnection.modify<{ data: { customPath?: string } }>({
        key: contentId,
        editor: (content) => {
            content.data.customPath = undefined;

            return content;
        },
    });
};

// When a content is duplicated, we don't want the custom path
// to be duplicated as well, as it must be unique
const removeCustomPathOnDuplicate = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        const { branch, repo, id } = node;

        if (branch !== 'draft') {
            return;
        }

        const locale = getLayersData().repoIdToLocaleMap[repo];
        if (!locale) {
            return;
        }

        const repoConnection = getRepoConnection({ branch: 'draft', repoId: repo, asAdmin: true });

        const content = repoConnection.get(id);
        if (!content || !isContentLocalized(content) || !hasValidCustomPath(content)) {
            return;
        }

        logger.info(`Removing custom path from duplicated content ${id}`);

        removeCustomPath(id, repoConnection);
    });
};

const removeInvalidCustomPathOnPublish = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        const { branch, repo, id } = node;

        if (branch !== 'master') {
            return;
        }

        const locale = getLayersData().repoIdToLocaleMap[repo];
        if (!locale) {
            return;
        }

        const repoConnection = getRepoConnection({ branch: 'draft', repoId: repo, asAdmin: true });

        const content = repoConnection.get(id);
        if (!content || !isContentLocalized(content) || !hasInvalidCustomPath(content)) {
            return;
        }

        logger.info(`Removing invalid custom path on published content ${id}`);

        removeCustomPath(id, repoConnection);

        repoConnection.push({ key: id, target: 'master', includeChildren: false, resolve: false });
    });
};

let hasSetupListeners = false;

export const activateCustomPathNodeListeners = () => {
    if (hasSetupListeners) {
        logger.error('Event listeners for custom path validation were already started');
        return;
    }

    hasSetupListeners = true;

    eventLib.listener({
        type: '(node.duplicated|node.created)',
        localOnly: false,
        callback: removeCustomPathOnDuplicate,
    });

    eventLib.listener({
        type: 'node.pushed',
        localOnly: false,
        callback: removeInvalidCustomPathOnPublish,
    });

    logger.info('Started event listeners for custom path validation');
};
