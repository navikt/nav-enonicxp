import eventLib, { EnonicEvent } from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import contentLib from '/lib/xp/content';
import { hasInvalidCustomPath, hasValidCustomPath } from './custom-paths';
import { runInBranchContext } from '../utils/branch-context';

// When a content is duplicated, we don't want the custom path
// to be duplicated as well, as it must be unique
const removeOnDuplicate = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        runInBranchContext(
            () =>
                contentLib.modify({
                    key: node.id,
                    editor: (content) => {
                        if (hasValidCustomPath(content)) {
                            (content.data.customPath as string | null) = null;
                        }

                        return content;
                    },
                }),
            'draft'
        );
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

        runInBranchContext(() => {
            const content = contentLib.get({ key: node.id });

            if (content && hasInvalidCustomPath(content)) {
                contentLib.modify({
                    key: node.id,
                    editor: (content) => {
                        // (we already asserted that this field exists)
                        (content as { data: { customPath?: string } }).data.customPath = undefined;

                        return content;
                    },
                });
            }
        }, 'master');
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

        log.info('Started event listeners for custom path validation');
    } else {
        log.warning('Event listeners for custom path validation were already started');
    }
};
