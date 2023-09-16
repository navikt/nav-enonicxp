import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { getRepoConnection } from '../utils/repo-utils';
import { logger } from '../utils/logging';
import { getContentFromAllLayers } from './locale-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';

let hasSetupListeners = false;

// Publish/unpublish actions in the root layer should be propagated to non-localized content in child
// layers, as XP does not do this automatically
const propagatePublishEventsToLayers = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        const { id, branch, repo } = node;

        if (branch !== 'master' || repo !== CONTENT_ROOT_REPO_ID) {
            return;
        }

        const nonlocalized = getContentFromAllLayers({
            contentId: id,
            branch: 'draft',
            state: 'nonlocalized',
        });

        nonlocalized.forEach(({ repoId, locale }) => {
            if (repoId === CONTENT_ROOT_REPO_ID) {
                return;
            }

            if (event.type === 'node.pushed') {
                logger.info(`Pushing ${id} to master in layer ${locale}`);
                const result = getRepoConnection({ branch: 'draft', repoId, asAdmin: true }).push({
                    key: id,
                    target: 'master',
                    resolve: false,
                });

                logger.info(
                    `Pushing ${id} to master in layer ${locale} result: ${JSON.stringify(result)}`
                );
            } else if (event.type === 'node.deleted') {
                logger.info(`Deleting ${id} from master in layer ${locale}`);
                const result = getRepoConnection({
                    branch: 'master',
                    repoId,
                    asAdmin: true,
                }).delete(id);
                logger.info(
                    `Deleting ${id} from master in layer ${locale} result: ${JSON.stringify(
                        result
                    )}`
                );
            }
        });
    });
};

export const activateLayersEventListeners = () => {
    if (hasSetupListeners) {
        logger.error('Localization event listeners were already setup');
        return;
    }

    hasSetupListeners = true;

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        localOnly: false,
        callback: propagatePublishEventsToLayers,
    });
};
