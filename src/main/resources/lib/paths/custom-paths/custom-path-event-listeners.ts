import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import { RepoConnection } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { hasInvalidCustomPath, hasValidCustomPath } from './custom-path-utils';
import { logger } from '../../utils/logging';
import { getLayersData } from '../../localization/layers-data';
import { isContentLocalized } from '../../localization/locale-utils';
import { getRepoConnection } from '../../utils/repo-utils';
import { isMainDatanode } from '../../cluster-utils/main-datanode';

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
    if (!isMainDatanode()) {
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

        const content = repoConnection.get<Content>(id);
        if (!content || !isContentLocalized(content) || !hasValidCustomPath(content)) {
            return;
        }

        logger.info(`Removing custom path from duplicated content ${id} in repo ${repo}`);

        removeCustomPath(id, repoConnection);
    });
};

const removeInvalidCustomPathOnPublish = (event: EnonicEvent) => {
    if (!isMainDatanode()) {
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

        const content = repoConnection.get<Content>(id);
        if (!content || !isContentLocalized(content) || !hasInvalidCustomPath(content)) {
            return;
        }

        logger.info(`Removing invalid custom path on published content ${id} in repo ${repo}`);

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
