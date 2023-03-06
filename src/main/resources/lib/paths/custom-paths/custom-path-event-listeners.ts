import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import * as contentLib from '/lib/xp/content';
import { hasInvalidCustomPath, hasValidCustomPath } from './custom-path-utils';
import { runInContext } from '../../context/run-in-context';
import { logger } from '../../utils/logging';

// When a content is duplicated, we don't want the custom path
// to be duplicated as well, as it must be unique
const removeOnDuplicate = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        runInContext({ branch: 'draft', asAdmin: true }, () => {
            logger.info(`Removing custom path from duplicated content ${node.id}`);

            contentLib.modify({
                key: node.id,
                requireValid: false,
                editor: (content) => {
                    if (hasValidCustomPath(content)) {
                        (content.data.customPath as string | undefined) = undefined;
                    }

                    return content;
                },
            });
        });
    });
};

const removeInvalidOnPublish = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        if (node.branch !== 'master') {
            return;
        }

        runInContext({ branch: 'master', asAdmin: true }, () => {
            const content = contentLib.get({ key: node.id });

            if (content && hasInvalidCustomPath(content)) {
                logger.info(`Removing invalid custom path on published content ${node.id}`);

                contentLib.modify({
                    key: node.id,
                    requireValid: false,
                    editor: (content) => {
                        // (we already asserted that this field exists)
                        (content as { data: { customPath?: string } }).data.customPath = undefined;

                        return content;
                    },
                });
            }
        });
    });
};

let hasSetupListeners = false;

export const activateCustomPathNodeListeners = () => {
    if (!hasSetupListeners) {
        hasSetupListeners = true;

        eventLib.listener({
            type: 'node.duplicated',
            localOnly: false,
            callback: removeOnDuplicate,
        });

        eventLib.listener({
            type: 'node.pushed',
            localOnly: false,
            callback: removeInvalidOnPublish,
        });

        logger.info('Started event listeners for custom path validation');
    } else {
        logger.error('Event listeners for custom path validation were already started');
    }
};
