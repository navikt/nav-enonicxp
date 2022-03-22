import eventLib, { EnonicEvent } from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import contentLib from '/lib/xp/content';
import { hasCustomPath } from '../custom-paths/custom-paths';
import { runInBranchContext } from '../utils/branch-context';

let hasSetupListeners = false;

const duplicatedNodeCallback = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }
    event.data.nodes.forEach((node) => {
        runInBranchContext(
            () =>
                contentLib.modify({
                    key: node.id,
                    editor: (content) => {
                        log.info(JSON.stringify(content.data));
                        if (hasCustomPath(content)) {
                            (content.data.customPath as string | null) = null;
                        }

                        return content;
                    },
                }),
            'draft'
        );
    });
};

export const activateNodeDuplicationListener = () => {
    if (!hasSetupListeners) {
        hasSetupListeners = true;

        eventLib.listener({
            type: 'node.duplicated',
            localOnly: false,
            callback: duplicatedNodeCallback,
        });

        log.info('Started node duplication event listener');
    } else {
        log.warning('Node duplication event listener was already started');
    }
};
