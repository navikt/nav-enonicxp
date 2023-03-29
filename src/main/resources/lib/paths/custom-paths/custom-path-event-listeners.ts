import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import * as contentLib from '/lib/xp/content';
import { hasInvalidCustomPath, hasValidCustomPath } from './custom-path-utils';
import { logger } from '../../utils/logging';
import { getLayersData } from '../../localization/layers-data';
import { runInLocaleContext } from '../../localization/locale-context';
import { isContentLocalized } from '../../localization/locale-utils';

type ContentWithCustomPath = { data: { customPath?: string } };

const removeCustomPath = (contentId: string) => {
    contentLib.modify({
        key: contentId,
        requireValid: false,
        editor: (content) => {
            (content as ContentWithCustomPath).data.customPath = undefined;

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
        if (node.branch !== 'draft') {
            return;
        }

        const locale = getLayersData().repoIdToLocaleMap[node.repo];
        if (!locale) {
            return;
        }

        runInLocaleContext({ locale, branch: 'draft', asAdmin: true }, () => {
            {
                const content = contentLib.get({ key: node.id });
                if (!content || !isContentLocalized(content) || !hasValidCustomPath(content)) {
                    return;
                }

                logger.info(`Removing custom path from duplicated content ${node.id}`);

                removeCustomPath(node.id);
            }
        });
    });
};

const removeInvalidCustomPathOnPublish = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        if (node.branch !== 'master') {
            return;
        }

        const locale = getLayersData().repoIdToLocaleMap[node.repo];
        if (!locale) {
            return;
        }

        runInLocaleContext({ locale, branch: 'master', asAdmin: true }, () => {
            const content = contentLib.get({ key: node.id });
            if (!content || !isContentLocalized(content) || !hasInvalidCustomPath(content)) {
                return;
            }

            logger.info(`Removing invalid custom path on published content ${node.id}`);

            removeCustomPath(node.id);
        });
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
